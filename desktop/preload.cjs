const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('ageneticDesktop',Object.freeze({getConnection:()=>ipcRenderer.invoke('companion:connection'),chooseModel:()=>ipcRenderer.invoke('companion:choose'),openCommunity:()=>ipcRenderer.invoke('app:community'),openWebsite:()=>ipcRenderer.invoke('app:website'),checkUpdate:()=>ipcRenderer.invoke('app:update')}));
