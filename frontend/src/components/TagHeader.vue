<template>
  <div 
    class="tag-header"
    :class="{ 
      'tag-header--collapsed': state.collapsed,
      'tag-header--drag-over': state.ui.dragOver
    }"
    @click="toggleCollapsed"
    @dragover.prevent="state.ui.dragOver = true"
    @dragleave="state.ui.dragOver = false"
    @drop="handleDrop"
  >
    <!-- Collapse/Expand Arrow -->
    <span class="tag-header__arrow">
      {{ state.collapsed ? '▶' : '▼' }}
    </span>

    <!-- Tag Name -->
    <span class="tag-header__name">
      {{ state.tag }}
    </span>

    <!-- Count Badge -->
    <span class="tag-header__count">
      {{ state.count }}
    </span>

    <!-- Quick Actions (visible on hover) -->
    <div class="tag-header__actions">
      <button 
        class="tag-header__action"
        @click.stop="emit('collapse-all')"
        title="Collapse all tags"
      >
        ⏫
      </button>
      <button 
        class="tag-header__action"
        @click.stop="emit('expand-all')"
        title="Expand all tags"
      >
        ⏬
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TagHeaderState } from '@/types';

// Props
const props = defineProps<{
  state: TagHeaderState;
}>();

// Emits
const emit = defineEmits<{
  (e: 'toggle'): void;
  (e: 'collapse-all'): void;
  (e: 'expand-all'): void;
  (e: 'drop', data: any): void;
  (e: 'update:state', state: TagHeaderState): void;
}>();

// Methods
function toggleCollapsed() {
  emit('toggle');
  emit('update:state', {
    ...props.state,
    collapsed: !props.state.collapsed
  });
}

function handleDrop(event: DragEvent) {
  props.state.ui.dragOver = false;
  const data = event.dataTransfer?.getData('application/json');
  if (data) {
    try {
      emit('drop', JSON.parse(data));
    } catch {}
  }
}
</script>

<style scoped lang="scss">
.tag-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: linear-gradient(135deg, #3d3d3d 0%, #2d2d2d 100%);
  border-radius: 6px;
  border: 1px solid #4a4a4a;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
  
  &:hover {
    border-color: #5a5a5a;
    
    .tag-header__actions {
      opacity: 1;
    }
  }
  
  &--collapsed {
    .tag-header__arrow {
      color: #888;
    }
  }
  
  &--drag-over {
    border-color: #ffd700;
    background: linear-gradient(135deg, #4d4d3d 0%, #3d3d2d 100%);
  }
}

.tag-header__arrow {
  font-size: 10px;
  color: #aaa;
  width: 12px;
  text-align: center;
  flex-shrink: 0;
}

.tag-header__name {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-header__count {
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-size: 10px;
  color: #aaa;
  flex-shrink: 0;
}

.tag-header__actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.tag-header__action {
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 10px;
  cursor: pointer;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}
</style>
