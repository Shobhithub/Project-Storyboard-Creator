import { create } from 'zustand';

type EditorState={selectedPageId:string|null;activePanel:'chat'|'canvas'|'details';setSelectedPage:(id:string|null)=>void;setActivePanel:(panel:EditorState['activePanel'])=>void};
export const useEditorStore=create<EditorState>(set=>({selectedPageId:null,activePanel:'canvas',setSelectedPage:id=>set({selectedPageId:id}),setActivePanel:activePanel=>set({activePanel})}));
