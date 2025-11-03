/**
 * Overlay and toast utilities shared across the Super LoRA node and ND Super Selector enhancer.
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
  private stylesInjected = false;

  static getInstance(): OverlayService {
    if (!OverlayService.instance) {
      OverlayService.instance = new OverlayService();
    }
    return OverlayService.instance;
  }

  showSearchOverlay(options: OverlayOptions): void {
    this.ensureOverlayStyles();

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
    let lastClickedIndex: number | null = null;

    const controls = document.createElement('div');
    controls.style.cssText = `
      display: ${multiEnabled ? 'flex' : 'none'};
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 0 12px 6px 12px;
      color: #ddd;
      font-size: 12px;
    `;

    const selectionBtnsWrap = document.createElement('div');
    selectionBtnsWrap.style.cssText = `
      display: none;
      gap: 8px;
    `;

    const selectAllBtn = document.createElement('button');
    selectAllBtn.type = 'button';
    selectAllBtn.textContent = 'Select All';
    selectAllBtn.className = 'nd-overlay-select-btn';
    selectAllBtn.addEventListener('click', () => {
      const filtered = getFilteredItems();
      filtered.forEach((item) => {
        if (!item.disabled) {
          selectedIds.add(item.id);
        }
      });
      render(search.value);
    });

    const unselectAllBtn = document.createElement('button');
    unselectAllBtn.type = 'button';
    unselectAllBtn.textContent = 'Unselect All';
    unselectAllBtn.className = 'nd-overlay-select-btn';
    unselectAllBtn.addEventListener('click', () => {
      selectedIds.clear();
      render(search.value);
    });

    selectionBtnsWrap.appendChild(selectAllBtn);
    selectionBtnsWrap.appendChild(unselectAllBtn);

    const rightControls = document.createElement('div');
    rightControls.style.cssText = 'display: flex; align-items: center; gap: 10px;';

    const multiLabel = document.createElement('label');
    multiLabel.className = 'nd-overlay-multi-toggle';
    const multiToggle = document.createElement('input');
    multiToggle.type = 'checkbox';
    multiToggle.className = 'nd-overlay-multi-toggle-checkbox';
    multiToggle.addEventListener('change', () => {
      multiMode = !!multiToggle.checked;
      selectionBtnsWrap.style.display = multiMode ? 'flex' : 'none';
      render(search.value);
      renderFooter();
    });
    const multiText = document.createElement('span');
    multiText.textContent = 'Multi-select';
    multiText.className = 'nd-overlay-multi-toggle-label';
    multiLabel.appendChild(multiToggle);
    multiLabel.appendChild(multiText);
    rightControls.appendChild(multiLabel);

    controls.appendChild(selectionBtnsWrap);
    controls.appendChild(rightControls);

  const chipWrap = document.createElement('div');
  chipWrap.className = 'nd-overlay-chips-container';

  const subChipWrap = document.createElement('div');
  subChipWrap.className = 'nd-overlay-subchips-container';
  subChipWrap.style.display = 'none';

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

    const getFilteredItems = (): OverlayItem[] => {
      const query = (search.value || '').trim().toLowerCase();
      const termFiltered = query ? items.filter((item) => item.label.toLowerCase().includes(query)) : items;

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
          filtered = [{ id: (search.value || '').trim(), label: `Create "${(search.value || '').trim()}"` }, ...filtered];
        }
      }

      return filtered;
    };

    const renderChips = (folderCounts: Record<string, number>) => {
      chipWrap.innerHTML = '';
      const header = document.createElement('div');
      header.className = 'nd-overlay-chip-header';
      header.textContent = 'Folders';
      chipWrap.appendChild(header);

      const chipList = document.createElement('div');
      chipList.className = 'nd-overlay-chip-list';
      chipWrap.appendChild(chipList);

      const allFolderNames = Object.keys(folderCounts)
        .sort((a, b) => {
          if (a === ROOT_KEY) return -1;
          if (b === ROOT_KEY) return 1;
          return a.localeCompare(b);
        });

      const baseFolderName = options.baseFolderName || 'files';

      allFolderNames.forEach((name) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'nd-overlay-chip';
        const isActive = activeFolders.has(name);
        if (isActive) chip.classList.add('is-active');

        const icon = document.createElement('span');
        icon.className = 'nd-overlay-chip-icon';
        icon.textContent = name === ROOT_KEY ? '🏠' : '📁';

        const label = document.createElement('span');
        label.className = 'nd-overlay-chip-label';
        label.textContent = (name === ROOT_KEY) ? `${baseFolderName} (root)` : name;

        const count = document.createElement('span');
        count.className = 'nd-overlay-chip-count';
        count.textContent = String(folderCounts[name] ?? 0);

        chip.appendChild(icon);
        chip.appendChild(label);
        chip.appendChild(count);

        chip.title = name === ROOT_KEY ? `${baseFolderName} root` : name;
        chip.addEventListener('click', () => {
          if (activeFolders.has(name)) {
            activeFolders.delete(name);
          } else {
            activeFolders.add(name);
          }
          this.persistOverlayState(baseFolderKey, activeFolders, activeSubfolders);
          render(search.value);
          renderSubChips();
        });

        chipList.appendChild(chip);
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

      const header = document.createElement('div');
      header.className = 'nd-overlay-chip-header';
      header.textContent = activeFolders.size === 1 ? 'Subfolders' : 'Subfolders (selected)';
      subChipWrap.appendChild(header);

      const chipList = document.createElement('div');
      chipList.className = 'nd-overlay-chip-list';
      subChipWrap.appendChild(chipList);

      Object.keys(subCountsByKey).sort().forEach((key) => {
        const [top, sub] = key.split('/');
        const isRootSub = (sub === ROOT_KEY);
        const duplicate = subToTops[sub]?.size && subToTops[sub]!.size > 1;
        const labelText = isRootSub ? `${top} (root)` : duplicate ? `${top} / ${sub}` : sub;
        const countVal = subCountsByKey[key] ?? 0;

        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'nd-overlay-chip nd-overlay-chip--sub';
        const isActive = activeSubfolders.has(key);
        if (isActive) chip.classList.add('is-active');

        const icon = document.createElement('span');
        icon.className = 'nd-overlay-chip-icon';
        icon.textContent = isRootSub ? '🗂️' : '↳';

        const label = document.createElement('span');
        label.className = 'nd-overlay-chip-label';
        label.textContent = labelText;

        const count = document.createElement('span');
        count.className = 'nd-overlay-chip-count';
        count.textContent = String(countVal);

        chip.appendChild(icon);
        chip.appendChild(label);
        chip.appendChild(count);

        chip.title = `${top}/${isRootSub ? '(root)' : sub}`;
        chip.addEventListener('click', () => {
          if (activeSubfolders.has(key)) {
            activeSubfolders.delete(key);
          } else {
            activeSubfolders.add(key);
          }
          this.persistOverlayState(baseFolderKey, activeFolders, activeSubfolders);
          render(search.value);
          renderSubChips();
        });

        chipList.appendChild(chip);
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

      const filtered = getFilteredItems();

      empty.style.display = filtered.length ? 'none' : 'block';
      try { header.textContent = `${options.title} (${filtered.length}/${items.length})`; } catch {}

      const maxToShow = Math.min(2000, filtered.length);
      filtered.slice(0, maxToShow).forEach((item, index) => {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 0;';

        const leftBtn = document.createElement('button');
        leftBtn.type = 'button';
        leftBtn.className = 'nd-overlay-item-button';
        leftBtn.disabled = !!item.disabled;

  const rawParts = item.id.split(/[\\/]/);
  const parts = rawParts.filter(Boolean);
        const folderPath = parts.slice(0, -1);
        const lastSegment = parts[parts.length - 1] || item.label;
        const pathDisplay = folderPath.length ? folderPath.join(' / ') : '(root)';
        const isFolder = !/\.[^./\\]{2,}$/i.test(lastSegment);
        const iconGlyph = isFolder ? '📁' : '📄';
        leftBtn.title = item.id;

        const checkboxSpan = document.createElement('span');
        checkboxSpan.className = 'nd-overlay-item-checkbox';
  checkboxSpan.dataset.state = 'hidden';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'nd-overlay-item-icon';
        iconSpan.textContent = iconGlyph;
        iconSpan.setAttribute('aria-hidden', 'true');

        const textWrap = document.createElement('div');
        textWrap.className = 'nd-overlay-item-text';

        const primaryLine = document.createElement('div');
        primaryLine.className = 'nd-overlay-item-title';
        primaryLine.textContent = item.label;

        if (item.disabled) {
          const badge = document.createElement('span');
          badge.className = 'nd-overlay-item-badge';
          badge.textContent = 'added';
          primaryLine.appendChild(badge);
        }

        const secondaryLine = document.createElement('div');
        secondaryLine.className = 'nd-overlay-item-path';
        secondaryLine.textContent = pathDisplay;
        secondaryLine.style.display = folderPath.length ? 'block' : 'none';

        textWrap.appendChild(primaryLine);
        textWrap.appendChild(secondaryLine);

        leftBtn.appendChild(checkboxSpan);
        leftBtn.appendChild(iconSpan);
        leftBtn.appendChild(textWrap);

        const applyState = () => {
          const isSelected = selectedIds.has(item.id);
          if (!multiMode) {
            checkboxSpan.dataset.state = 'hidden';
          } else {
            checkboxSpan.dataset.state = isSelected ? 'checked' : 'unchecked';
          }
          leftBtn.classList.toggle('is-disabled', !!item.disabled);
          leftBtn.classList.toggle('is-selected', multiMode && isSelected);
        };

        applyState();

        leftBtn.addEventListener('click', (event: MouseEvent) => {
          if (item.disabled) return;
          if (!multiMode) {
            options.onChoose(item.id);
            closeOverlay();
            return;
          }

          // Handle shift-click for range selection
          if (event.shiftKey && lastClickedIndex !== null && lastClickedIndex !== index) {
            const start = Math.min(lastClickedIndex, index);
            const end = Math.max(lastClickedIndex, index);
            const displayedItems = filtered.slice(0, maxToShow);
            
            // When shift-clicking backwards (index < lastClickedIndex), unselect the range
            const isBackwardSelection = index < lastClickedIndex;
            
            for (let i = start; i <= end; i++) {
              if (displayedItems[i] && !displayedItems[i].disabled) {
                if (isBackwardSelection) {
                  selectedIds.delete(displayedItems[i].id);
                } else {
                  selectedIds.add(displayedItems[i].id);
                }
              }
            }
            render(search.value);
          } else {
            // Regular click toggles selection
            if (selectedIds.has(item.id)) {
              selectedIds.delete(item.id);
            } else {
              selectedIds.add(item.id);
            }
            applyState();
            renderFooter();
          }
          
          lastClickedIndex = index;
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

  private ensureOverlayStyles(): void {
    if (this.stylesInjected) return;
    try {
      if (typeof document === 'undefined') return;
      const existing = document.querySelector('style[data-super-lora-overlay-style="1"]');
      if (existing) {
        this.stylesInjected = true;
        return;
      }
      const style = document.createElement('style');
      style.setAttribute('data-super-lora-overlay-style', '1');
      style.textContent = `
        [data-super-lora-overlay="1"] .nd-overlay-item-button {
          position: relative;
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 8px 10px;
          background: #252525;
          border: 1px solid #3a3a3a;
          border-radius: 6px;
          color: #fff;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-button:hover:not(.is-disabled) {
          background: #2c2c2c;
          border-color: #4a4a4a;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-button.is-disabled {
          background: #2a2a2a;
          color: #888;
          cursor: not-allowed;
          border-color: #343434;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-button.is-selected {
          background: #263238;
          border-color: #4a90e2;
          box-shadow: inset 0 0 0 1px rgba(74, 144, 226, 0.35);
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-checkbox {
          width: 16px;
          height: 16px;
          min-width: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #4a4a4a;
          border-radius: 4px;
          background: #1d1d1d;
          color: #8ab4f8;
          font-size: 12px;
          line-height: 1;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-checkbox[data-state="hidden"] {
          opacity: 0;
          visibility: hidden;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-checkbox[data-state="unchecked"]::after {
          content: '';
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-checkbox[data-state="checked"] {
          border-color: #4a90e2;
          background: rgba(74, 144, 226, 0.18);
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-checkbox[data-state="checked"]::after {
          content: '✔';
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-checkbox::after {
          font-size: 10px;
          color: #8ab4f8;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-icon {
          font-size: 16px;
          line-height: 1.5;
          opacity: 0.85;
          min-width: 18px;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-title {
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-path {
          font-size: 12px;
          color: #9aa4b4;
          opacity: 0.85;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        [data-super-lora-overlay="1"] .nd-overlay-item-badge {
          font-size: 11px;
          color: #9aa4b4;
          border: 1px solid #4a4f55;
          border-radius: 999px;
          padding: 1px 6px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chips-container,
        [data-super-lora-overlay="1"] .nd-overlay-subchips-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 0 12px 6px 12px;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip-header {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9aa4b4;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #3a3a3a;
          background: #252525;
          color: #fff;
          cursor: pointer;
          font-size: 12px;
          transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip.is-active {
          border-color: #4a90e2;
          background: rgba(74, 144, 226, 0.18);
          box-shadow: inset 0 0 0 1px rgba(74, 144, 226, 0.35);
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip-icon {
          font-size: 14px;
          opacity: 0.85;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip-label {
          font-weight: 500;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip-count {
          font-size: 11px;
          background: rgba(255, 255, 255, 0.08);
          padding: 0 6px;
          border-radius: 999px;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip--sub {
          font-size: 11px;
          padding: 5px 9px;
          background: #1f1f1f;
        }
        [data-super-lora-overlay="1"] .nd-overlay-chip--sub.is-active {
          background: rgba(255, 255, 255, 0.06);
          border-color: #66aaff;
        }
        [data-super-lora-overlay="1"] .nd-overlay-multi-toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid #3a3a3a;
          background: #1f1f1f;
          color: #fff;
          font-size: 12px;
          cursor: pointer;
          user-select: none;
        }
        [data-super-lora-overlay="1"] .nd-overlay-multi-toggle-checkbox {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid #4a4a4a;
          background: #111;
          position: relative;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        [data-super-lora-overlay="1"] .nd-overlay-multi-toggle-checkbox:checked {
          border-color: #4a90e2;
          background: rgba(74, 144, 226, 0.2);
        }
        [data-super-lora-overlay="1"] .nd-overlay-multi-toggle-checkbox:checked::after {
          content: '✔';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -55%);
          font-size: 10px;
          color: #8ab4f8;
        }
        [data-super-lora-overlay="1"] .nd-overlay-multi-toggle-label {
          font-weight: 500;
          letter-spacing: 0.01em;
        }
        [data-super-lora-overlay="1"] .nd-overlay-select-btn {
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #4a4a4a;
          background: #2a2a2a;
          color: #fff;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        [data-super-lora-overlay="1"] .nd-overlay-select-btn:hover {
          background: #333;
          border-color: #5a5a5a;
        }
      `;
      document.head.appendChild(style);
      this.stylesInjected = true;
    } catch {}
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

