import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from './store';
import {
  fetchElements,
  addItem,
  addFolder,
  updateElement,
} from './store/slices/elementsSlice';
import { Item, Folder } from './types/types';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5023/api';
const socket: Socket = io('http://localhost:5023');

interface ElementProps {
  element: Item | Folder;
}

const Element = ({
  element,
  depth,
  refresh,
}: {
  element: Item | Folder;
  depth: number;
  refresh: () => void;
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
    type: 'ELEMENT',
    item: element,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const [, drop] = useDrop({
    accept: 'ELEMENT',
    drop: (dragged: Item | Folder) => {
      if (dragged._id !== element._id) {
        dispatch(updateElement({ id: dragged._id, updates: { parentId: element._id } }))
          .then(() => {
            socket.emit('updateElement', { id: dragged._id, updates: { parentId: element._id } });
            refresh();
          });
      }
    },
  });

  const handleToggleFolder = () => {
    if ('isOpen' in element) {
      dispatch(updateElement({ id: element._id, updates: { isOpen: !element.isOpen } }))
        .then(() => {
          socket.emit('updateElement', { id: element._id, updates: { isOpen: !element.isOpen } });
          refresh();
        });
    }
  };

  return (
    <div
      ref={(node) => {
        if (node) drag(drop(node));
      }}
      style={{
        opacity: isDragging ? 0.5 : 1,
        marginLeft: depth * 20,
        cursor: 'pointer',
      }}
      onClick={handleToggleFolder}
      className="py-1"
    >
      {'icon' in element
        ? (<span>{element.icon} {element.title}</span>)
        : (<span>📂 {element.name} ({element.isOpen ? 'Open' : 'Closed'})</span>)
      }
    </div>
  );
};

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, folders } = useSelector((state: RootState) => state.elements);
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('📄');
  const [folderName, setFolderName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const refreshPage = () => window.location.reload();

  useEffect(() => {
    dispatch(fetchElements());
    socket.emit('requestInitialData');

    socket.on('initialData', () => dispatch(fetchElements()));
    socket.on('itemCreated', () => dispatch(fetchElements()));
    socket.on('itemUpdated', () => dispatch(fetchElements()));
    socket.on('folderCreated', () => dispatch(fetchElements()));
    socket.on('folderUpdated', () => dispatch(fetchElements()));

    return () => {
      socket.off('initialData');
      socket.off('itemCreated');
      socket.off('itemUpdated');
      socket.off('folderCreated');
      socket.off('folderUpdated');
    };
  }, [dispatch]);

  const handleAddItem = () => {
    if (!title.trim()) {
      alert('Item title is required!');
      return;
    }
    const newItem = { title, icon, order: items.length, parentId };
    dispatch(addItem(newItem));
    socket.emit('createItem', newItem);
    setTitle('');
    window.location.reload(); // Refresh after adding
  };

  const handleAddFolder = async () => {
    try {
      const newFolder = { name: folderName, parentId, order: folders.length, isOpen: true };
      await axios.post(`${API_BASE_URL}/folders`, newFolder);
      dispatch(fetchElements());
      setFolderName('');
      window.location.reload(); // Refresh after adding
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const renderTree = (parentId: string | null, depth = 0) => {
    const childFolders = folders.filter(f => f.parentId === parentId).sort((a, b) => a.order - b.order);
    const childItems = items.filter(i => i.parentId === parentId).sort((a, b) => a.order - b.order);

    return (
      <div>
        {childFolders.map(folder => (
          <div key={folder._id}>
            <Element element={folder} depth={depth} refresh={refreshPage} />
            {folder.isOpen && renderTree(folder._id, depth + 1)}
          </div>
        ))}
        {childItems.map(item => (
          <Element key={item._id} element={item} depth={depth} refresh={refreshPage} />
        ))}
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">📂 Item & Folder Manager</h1>

        <div className="flex gap-2 mb-4">
          <input
            className="border p-2 w-48"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Item title"
          />
          <input
            className="border p-2 w-16"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="Icon"
          />
          <select className="border p-2" value={parentId || ''} onChange={(e) => setParentId(e.target.value || null)}>
            <option value="">No Parent</option>
            {folders.map((folder) => (
              <option key={folder._id} value={folder._id}>{folder.name}</option>
            ))}
          </select>
          <button className="p-2 bg-blue-500 text-white" onClick={handleAddItem}>Add Item</button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            className="border p-2 w-48"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
          />
          <select className="border p-2" value={parentId || ''} onChange={(e) => setParentId(e.target.value || null)}>
            <option value="">No Parent</option>
            {folders.map((folder) => (
              <option key={folder._id} value={folder._id}>{folder.name}</option>
            ))}
          </select>
          <button className="p-2 bg-green-500 text-white" onClick={handleAddFolder}>Add Folder</button>
        </div>

        {renderTree(null)}
      </div>
    </DndProvider>
  );
};

export default App;
