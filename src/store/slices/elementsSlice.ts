import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { Item, Folder } from '../../types/types';

interface ElementsState {
  items: Item[];
  folders: Folder[];
  loading: boolean;
}

const API_BASE_URL = 'http://localhost:5023/api';

const initialState: ElementsState = {
  items: [],
  folders: [],
  loading: false,
};

// ✅ Fetch both items and folders from /api/elements
export const fetchElements = createAsyncThunk('elements/fetchElements', async () => {
  const response = await axios.get(`${API_BASE_URL}/elements`);
  return response.data; // Should be { items: [], folders: [] }
});

// ✅ Add Item to /api/items
export const addItem = createAsyncThunk('elements/addItem', async (item: Partial<Item>) => {
  const response = await axios.post(`${API_BASE_URL}/items`, item);
  return response.data;
});

// ✅ Add Folder to /api/folders
export const addFolder = createAsyncThunk('elements/addFolder', async (folder: Partial<Folder>) => {
  const response = await axios.post(`${API_BASE_URL}/folders`, folder);
  return response.data;
});

// ✅ Update either Item or Folder based on presence of 'title'
export const updateElement = createAsyncThunk(
  'elements/updateElement',
  async ({ id, updates }: { id: string; updates: Partial<Item | Folder> }) => {
    const isItem = Object.prototype.hasOwnProperty.call(updates, 'title');
    const url = isItem ? `${API_BASE_URL}/items/${id}` : `${API_BASE_URL}/folders/${id}`;
    const response = await axios.put(url, updates);
    return response.data;
  }
);

const elementsSlice = createSlice({
  name: 'elements',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchElements.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchElements.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.folders = action.payload.folders;
      })
      .addCase(fetchElements.rejected, (state) => {
        state.loading = false;
      })
      .addCase(addItem.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(addFolder.fulfilled, (state, action) => {
        state.folders.push(action.payload);
      })
      .addCase(updateElement.fulfilled, (state, action) => {
        const updated = action.payload;
        const indexItem = state.items.findIndex((i) => i._id === updated._id);
        const indexFolder = state.folders.findIndex((f) => f._id === updated._id);
        if (indexItem > -1) state.items[indexItem] = updated;
        if (indexFolder > -1) state.folders[indexFolder] = updated;
      });
  },
});

export default elementsSlice.reducer;
