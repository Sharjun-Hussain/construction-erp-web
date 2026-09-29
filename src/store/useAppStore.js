"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
export const useAppStore = create(persist((set) => ({
  lang: "en",
  projectId: "",
  setLang: (lang) => set({ lang }),
  setProjectId: (projectId) => set({ projectId }),
}), { name: "qulf-ui" }));
