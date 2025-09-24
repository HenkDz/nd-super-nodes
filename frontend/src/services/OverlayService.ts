/**
 * Overlay and toast utilities shared across the Super LoRA node and ND Power UI enhancer.
 */

export type OverlayItem = {
  id: string;
  label: string;
  disabled?: boolean;
};

export type OverlayAction = {
  icon: string;
  title?: string;
  onClick: (id: string) => void;
};

export interface OverlayOptions {
  title: string;
  placeholder: string;
  items: OverlayItem[];
  onChoose: (id: string) => void;
  allowCreate?: boolean;
  enableMultiToggle?: boolean;
  onChooseMany?: (ids: string[]) => void;
  rightActions?: OverlayAction[];
  onRightAction?: (id: string) => void;
  rightActionIcon?: string;
  rightActionTitle?: string;
  folderChips?: string[];
  baseFolderName?: string;
  currentValue?: string;
}

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export class OverlayService {
  private static instance: OverlayService;

  static getInstance(): OverlayService {
    if (!OverlayService.instance) {
      OverlayService.instance = new OverlayService();
    }
    return OverlayService.instance;
  }

  showSearchOverlay(options: OverlayOptions): void {
    const baseFolderKey = options.baseFolderName || 'files';
    const restoredState = this.restoreOverlayState(baseFolderKey);

    this.removeExistingOverlays();

    const items = options.items ?? [];
    const overlay = document.createElement('div');
    overlay.setAttribute('data-super-lora-overlay', '1');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      z-index: 2147483600;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(2px);
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      width: 560px;
      max-height: 70vh;
      background: #222;
      border: 1px solid #444;
      border-radius: 8px;
      box-shadow: 0 12px 30px rgba(0,0,0,0.4);
      color: #fff;
      font-family: 'Segoe UI', Arial, sans-serif;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    const header = document.createElement('div');
    header.textContent = options.title;
    header.style.cssText = `
      padding: 12px 14px;
      font-weight: 600;
      border-bottom: 1px solid #444;
      background: #2a2a2a;
    `;

    const search = document.createElement('input');
    search.type = 'text';
    search.placeholder = options.placeholder;
    search.style.cssText = `
      margin: 10px 12px;
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid #555;
      background: #1a1a1a;
      color: #fff;
      outline: none;
    `;

    const multiEnabled = !!options.enableMultiToggle;
    let multiMode = false;
    const selectedIds = new Set<string>();
    const ROOT_KEY = '__ROOT__';

    const controls = document.createElement('div');
    controls.style.cssText = `
      display: ${multiEnabled ? 'flex' : 'none'};
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 0 12px 6px 12px;
      color: #ddd;
      font-size: 12px;
    `;

    const multiLabel = document.createElement('label');
    multiLabel.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;';
    const multiToggle = document.createElement('input');
    multiToggle.type = 'checkbox';
    multiToggle.addEventListener('change', () => {
      multiMode = !!multiToggle.checked;
      render(search.value);
      renderFooter();
    });
    const multiText = document.createElement('span');
    multiText.textContent = 'Multi-select';
    multiLabel.appendChild(multiToggle);
    multiLabel.appendChild(multiText);
    controls.appendChild(multiLabel);

    const chipWrap = document.createElement('div');
    chipWrap.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 6px 12px;';

    const subChipWrap = document.createElement('div');
    subChipWrap.style.cssText = 'display: none; flex-wrap: wrap; gap: 6px; padding: 0 12px 6px 12px;';

    let folderFeatureEnabled = false;
    const activeFolders = new Set<string>(restoredState.activeFolders);
    const activeSubfolders = new Set<string>(restoredState.activeSubfolders);

    const listWrap = document.createElement('div');
    listWrap.style.cssText = 'overflow: auto; padding: 6px 4px 10px 4px;';

    const list = document.createElement('div');
    list.style.cssText = 'display: flex; flex-direction: column; gap: 4px; padding: 0 8px 8px 8px;';

    const empty = document.createElement('div');
    empty.textContent = 'No results';
    empty.style.cssText = 'padding: 12px; color: #aaa; display: none;';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeOverlay();
      }
    };

    const closeOverlay = () => {
      try { overlay.remove(); } catch {}
      document.removeEventListener('keydown', handleKeyDown);
    this.persistOverlayState(baseFolderKey, activeFolders, activeSubfolders);
    };

    document.addEventListener('keydown', handleKeyDown);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeOverlay();
    });

    const renderChips = (folderCounts: Record<string, number>) => {
      chipWrap.innerHTML = '';
      const allFolderNames = Object.keys(folderCounts);
      allFolderNames.sort((a, b) => {
        if (a === ROOT_KEY) return -1;
        if (b === ROOT_KEY) return 1;
        return a.localeCompare(b);
      });
      allFolderNames.forEach((name) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        const isActive = activeFolders.has(name);
        const baseFolderName = options.baseFolderName || 'files';
        const label = (name === ROOT_KEY) ? `${baseFolderName} - root` : name;
        const count = folderCounts[name] ?? 0;
        chip.textContent = `${label} (${count})`;
        chip.style.cssText = `
          padding: 6px 10px; border-radius: 6px; background: ${isActive ? '#333' : '#252525'};
          color: #fff; border: ${isActive ? '2px solid #66aaff' : '1px solid #3a3a3a'}; cursor: pointer;
        `;
        chip.addEventListener('click', () => {
          if (activeFolders.has(name)) activeFolders.delete(name); else activeFolders.add(name);
          this.persistOverlayState(baseFolderKey, activeFolders, activeSubfolders);
          render(search.value);
          renderSubChips();
        });
        chipWrap.appendChild(chip);
      });
    };

    const renderSubChips = () => {
      subChipWrap.innerHTML = '';
      const show = activeFolders.size > 0;
      subChipWrap.style.display = show ? 'flex' : 'none';
      if (!show) return;

      const subCountsByKey: Record<string, number> = {};
      const subToTops: Record<string, Set<string>> = {};
      items.forEach((item) => {
        const parts = item.id.split(/[\\/]/);
        const top = parts.length > 1 ? parts[0] : ROOT_KEY;
        if (top === ROOT_KEY) return;
        if (!activeFolders.has(top)) return;
        const sub = parts.length > 2 ? parts[1] : ROOT_KEY;
        if (sub === ROOT_KEY) {
          const key = `${top}/${ROOT_KEY}`;
          subCountsByKey[key] = (subCountsByKey[key] || 0) + 1;
          if (!subToTops['(root)']) subToTops['(root)'] = new Set<string>();
          subToTops['(root)'].add(top);
          return;
        }
        const key = `${top}/${sub}`;
        subCountsByKey[key] = (subCountsByKey[key] || 0) + 1;
        if (!subToTops[sub]) subToTops[sub] = new Set<string>();
        subToTops[sub].add(top);
      });

      Object.keys(subCountsByKey).sort().forEach((key) => {
        const [top, sub] = key.split('/');
        const isRootSub = (sub === ROOT_KEY);
        let label: string;
        if (isRootSub) {
          label = `${top} - root`;
        } else {
          const duplicate = subToTops[sub]?.size && subToTops[sub]!.size > 1;
          label = duplicate ? `${sub} (${top})` : sub;
        }
        const count = subCountsByKey[key] ?? 0;
        const chip = document.createElement('button');
        chip.type = 'button';
        const isActive = activeSubfolders.has(key);
        chip.textContent = `${label} (${count})`;
        chip.title = `${top}/${sub}`;
        chip.style.cssText = `
          padding: 6px 10px; border-radius: 6px; background: ${isActive ? '#333' : '#252525'};
          color: #fff; border: ${isActive ? '2px solid #66aaff' : '1px solid #3a3a3a'}; cursor: pointer;
        `;
        chip.addEventListener('click', () => {
          if (activeSubfolders.has(key)) activeSubfolders.delete(key); else activeSubfolders.add(key);
          this.persistOverlayState(baseFolderKey, activeFolders, activeSubfolders);
          render(search.value);
          renderSubChips();
        });
        subChipWrap.appendChild(chip);
      });
    };

    const render = (term: string) => {
      list.innerHTML = '';
      const query = (term || '').trim().toLowerCase();
      const termFiltered = query ? items.filter((item) => item.label.toLowerCase().includes(query)) : items;

      if (folderFeatureEnabled) {
        const folderCounts: Record<string, number> = {};
        termFiltered.forEach((item) => {
          const parts = item.id.split(/[\\/]/);
          const top = parts.length > 1 ? parts[0] : ROOT_KEY;
          folderCounts[top] = (folderCounts[top] || 0) + 1;
        });
        renderChips(folderCounts);
      }

      let filtered = termFiltered;
      if (folderFeatureEnabled && activeFolders.size > 0) {
        filtered = termFiltered.filter((item) => {
          const parts = item.id.split(/[\\/]/);
          const top = parts.length > 1 ? parts[0] : ROOT_KEY;
          return activeFolders.has(top);
        });

        if (activeSubfolders.size > 0) {
          filtered = filtered.filter((item) => {
            const parts = item.id.split(/[\\/]/);
            const top = parts.length > 1 ? parts[0] : '';
            if (!top) return false;
            const sub = parts.length > 2 ? parts[1] : ROOT_KEY;
            const key = `${top}/${sub}`;
            return activeSubfolders.has(key);
          });
        }
      }

      if (options.allowCreate && query) {
        const exact = items.some((item) => item.label.toLowerCase() === query);
        if (!exact) {
          filtered = [{ id: term, label: `Create "${term}"` }, ...filtered];
        }
      }

      empty.style.display = filtered.length ? 'none' : 'block';
      try { header.textContent = `${options.title} (${filtered.length}/${items.length})`; } catch {}

      const maxToShow = Math.min(2000, filtered.length);
      filtered.slice(0, maxToShow).forEach((item) => {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 0;';

        const leftBtn = document.createElement('button');
        leftBtn.type = 'button';
        const isSelected = selectedIds.has(item.id);
        leftBtn.textContent = (multiMode ? (isSelected ? '☑ ' : '☐ ') : '') + item.label + (item.disabled ? '  (added)' : '');
        leftBtn.disabled = !!item.disabled;
        leftBtn.style.cssText = `
          flex: 1;
          text-align: left;
          padding: 10px 12px;
          background: ${item.disabled ? '#2a2a2a' : (multiMode && isSelected ? '#263238' : '#252525')};
          color: ${item.disabled ? '#888' : '#fff'};
          border: 1px solid #3a3a3a;
          border-radius: 6px;
          cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
        `;
        leftBtn.addEventListener('click', () => {
          if (item.disabled) return;
          if (!multiMode) {
            options.onChoose(item.id);
            closeOverlay();
            return;
          }
          if (selectedIds.has(item.id)) selectedIds.delete(item.id); else selectedIds.add(item.id);
          const nowSelected = selectedIds.has(item.id);
          leftBtn.textContent = (multiMode ? (nowSelected ? '☑ ' : '☐ ') : '') + item.label + (item.disabled ? '  (added)' : '');
          leftBtn.style.background = nowSelected ? '#263238' : '#252525';
          renderFooter();
        });
        row.appendChild(leftBtn);

        const actions: OverlayAction[] = [];
        if (options.rightActions && options.rightActions.length) {
          actions.push(...options.rightActions);
        } else if (options.onRightAction) {
          actions.push({ icon: options.rightActionIcon || '🗑', title: options.rightActionTitle, onClick: options.onRightAction });
        }

        if (actions.length && !item.disabled) {
          actions.forEach((action) => {
            const rightBtn = document.createElement('button');
            rightBtn.type = 'button';
            rightBtn.textContent = action.icon;
            if (action.title) rightBtn.title = action.title;
            rightBtn.style.cssText = `
              margin-left: 8px;
              padding: 10px 12px;
              background: #3a2a2a;
              color: #fff;
              border: 1px solid #5a3a3a;
              border-radius: 6px;
              cursor: pointer;
            `;
            rightBtn.addEventListener('click', (event) => {
              event.stopPropagation();
              event.preventDefault();
              action.onClick(item.id);
            });
            row.appendChild(rightBtn);
          });
        }

        list.appendChild(row);
      });

      renderFooter();
    };

    const footer = document.createElement('div');
    footer.style.cssText = `
      display: none;
      padding: 10px 12px;
      border-top: 1px solid #444;
      background: #1e1e1e;
      gap: 8px;
      justify-content: flex-end;
    `;

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = 'padding: 8px 12px; border-radius: 6px; background: #333; color: #fff; border: 1px solid #555; cursor: pointer;';
    clearBtn.addEventListener('click', () => {
      selectedIds.clear();
      render(search.value);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding: 8px 12px; border-radius: 6px; background: #444; color: #fff; border: 1px solid #555; cursor: pointer;';
    cancelBtn.addEventListener('click', () => closeOverlay());

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = 'Add Selected (0)';
    addBtn.style.cssText = 'padding: 8px 12px; border-radius: 6px; background: #1976d2; color: #fff; border: 1px solid #0d47a1; cursor: pointer; opacity: 0.6;';
    addBtn.disabled = true;
    addBtn.addEventListener('click', () => {
      if (!multiMode) return;
      const ids = Array.from(selectedIds);
      if (!ids.length) return;
      if (typeof options.onChooseMany === 'function') {
        options.onChooseMany(ids);
      } else {
        ids.forEach((id) => options.onChoose(id));
      }
      closeOverlay();
    });

    footer.appendChild(clearBtn);
    footer.appendChild(cancelBtn);
    footer.appendChild(addBtn);

    const renderFooter = () => {
      const count = selectedIds.size;
      addBtn.textContent = `Add Selected (${count})`;
      addBtn.disabled = count === 0;
      addBtn.style.opacity = count === 0 ? '0.6' : '1';
      footer.style.display = (multiEnabled && multiMode) ? 'flex' : 'none';
    };

    listWrap.appendChild(empty);
    listWrap.appendChild(list);
    panel.appendChild(header);
    panel.appendChild(search);
    panel.appendChild(controls);

    const allowFolderChips = (Array.isArray(options.folderChips) && options.folderChips.length > 0)
      || items.some((item) => /[\\/]/.test(item.id));
    if (allowFolderChips) {
      const initialCounts: Record<string, number> = {};
      items.forEach((item) => {
        const parts = item.id.split(/[\\/]/);
        const top = parts.length > 1 ? parts[0] : ROOT_KEY;
        initialCounts[top] = (initialCounts[top] || 0) + 1;
      });
      if (Object.keys(initialCounts).length) {
        folderFeatureEnabled = true;
        renderChips(initialCounts);
        panel.appendChild(chipWrap);
        panel.appendChild(subChipWrap);
        renderSubChips();
      }
    }

    panel.appendChild(listWrap);
    panel.appendChild(footer);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    search.addEventListener('input', () => render(search.value));
    setTimeout(() => {
      try { search.focus(); } catch {}
      render('');
      renderFooter();
    }, 0);
  }

  showToast(message: string, type: ToastType = 'info'): void {
    console.log(`Super LoRA Loader [${type}]: ${message}`);

    const colors: Record<ToastType, string> = {
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
      info: '#17a2b8'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 14px 20px;
      border-radius: 6px;
      z-index: 10000;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      opacity: 0;
      transition: all 0.3s ease;
      max-width: 400px;
      word-wrap: break-word;
      border-left: 4px solid rgba(255,255,255,0.3);
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    const timeout = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        try { toast.remove(); } catch {}
      }, 300);
    }, timeout);
  }

  private removeExistingOverlays(): void {
    try {
      document.querySelectorAll('[data-super-lora-overlay="1"]').forEach((el) => el.remove());
    } catch {}
  }

  private restoreOverlayState(baseFolderKey: string): { activeFolders: string[]; activeSubfolders: string[] } {
    try {
      const folderRaw = sessionStorage.getItem(this.getFolderStorageKey(baseFolderKey));
      const subRaw = sessionStorage.getItem(this.getSubfolderStorageKey(baseFolderKey));
      const activeFolders = folderRaw ? JSON.parse(folderRaw) : [];
      const activeSubfolders = subRaw ? JSON.parse(subRaw) : [];
      return {
        activeFolders: Array.isArray(activeFolders) ? activeFolders : [],
        activeSubfolders: Array.isArray(activeSubfolders) ? activeSubfolders : []
      };
    } catch {
      return { activeFolders: [], activeSubfolders: [] };
    }
  }

  private persistOverlayState(baseFolderKey: string, folders: Set<string>, subfolders: Set<string>): void {
    try {
      sessionStorage.setItem(this.getFolderStorageKey(baseFolderKey), JSON.stringify(Array.from(folders)));
      sessionStorage.setItem(this.getSubfolderStorageKey(baseFolderKey), JSON.stringify(Array.from(subfolders)));
    } catch {}
  }

  private getFolderStorageKey(baseFolderKey?: string): string {
    const suffix = baseFolderKey ? `_${baseFolderKey}` : '';
    return `superlora_folder_filters${suffix}`;
  }

  private getSubfolderStorageKey(baseFolderKey?: string): string {
    const suffix = baseFolderKey ? `_${baseFolderKey}` : '';
    return `superlora_subfolder_filters${suffix}`;
  }
}

