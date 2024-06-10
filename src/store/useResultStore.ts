import { create } from "zustand";

type State = {
  result: string;
  setResult: (val: string) => void;
  resetStore: () => void;
};

const initialState = {
  result: "--",
};

export const useResultStore = create<State>()((set) => ({
  ...initialState,
  setResult: (result: string) => set(() => ({ result })),
  resetStore: () => set({ ...initialState }),
}));
