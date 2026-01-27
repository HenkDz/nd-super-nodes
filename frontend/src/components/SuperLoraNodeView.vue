<script setup lang="ts">
/**
 * SuperLoraNodeView.vue
 * 
 * Root Vue component for Super LoRA Loader in Nodes 2.0 mode.
 * Orchestrates LoraRow and TagHeader components based on node state.
 */
import { ref, computed } from 'vue';
import LoraRow from './LoraRow.vue';
import TagHeader from './TagHeader.vue';
import type { LoraWidgetState, TagHeaderState, LoraConfig } from '@/types';

// Props from the node
const props = defineProps<{
  /** Array of LoRA configurations */
  loras: Array<{
    name: string;
    enabled: boolean;
    strength: number;
    clipStrength: number;
    tag?: string;
    triggerWords?: string[];
    isLoading?: boolean;
  }>;
  
  /** Tag groupings with collapsed state */
  tags: Array<{
    name: string;
    collapsed: boolean;
    loraCount: number;
  }>;
  
  /** Whether tags are enabled */
  tagsEnabled: boolean;
  
  /** Whether separate strengths are shown */
  showSeparateStrengths: boolean;
  
  /** Node ID for callbacks */
  nodeId: number;
}>();

// Events emitted to parent
const emit = defineEmits<{
  (e: 'toggle-enabled', index: number, enabled: boolean): void;
  (e: 'change-strength', index: number, strength: number, isClip: boolean): void;
  (e: 'remove-lora', index: number): void;
  (e: 'copy-trigger-words', index: number): void;
  (e: 'toggle-tag', tagName: string, collapsed: boolean): void;
  (e: 'add-lora', tagName?: string): void;
  (e: 'reorder-lora', fromIndex: number, toIndex: number): void;
}>();

// Local state
const draggedIndex = ref<number | null>(null);
const dropTargetIndex = ref<number | null>(null);

/**
 * Convert our props to LoraWidgetState for the LoraRow component
 */
function toLoraWidgetState(lora: typeof props.loras[0], index: number): LoraWidgetState {
  return {
    id: `lora-${index}`,
    config: {
      lora: lora.name,
      enabled: lora.enabled,
      strength_model: lora.strength,
      strength_clip: lora.clipStrength,
      tag: lora.tag || '',
      trigger_word: (lora.triggerWords || []).join(', '),
      auto_populated: false,
    },
    ui: {
      expanded: false,
      hovered: false,
      dragging: draggedIndex.value === index,
      loading: lora.isLoading || false,
      error: undefined,
    },
  };
}

/**
 * Convert our props to TagHeaderState for the TagHeader component
 */
function toTagHeaderState(tag: typeof props.tags[0]): TagHeaderState {
  return {
    tag: tag.name,
    collapsed: tag.collapsed,
    count: tag.loraCount,
    ui: {
      hovered: false,
      dragOver: false,
    },
  };
}

/**
 * Group LoRAs by tag when tags are enabled
 */
const groupedLoras = computed(() => {
  if (!props.tagsEnabled || !props.tags.length) {
    return [{ tag: null, loras: props.loras.map((l, i) => ({ ...l, originalIndex: i })) }];
  }
  
  const groups: Array<{
    tag: { name: string; collapsed: boolean; loraCount: number } | null;
    loras: Array<typeof props.loras[0] & { originalIndex: number }>;
  }> = [];
  
  // Group by tag
  const tagMap = new Map<string, typeof groups[0]>();
  const untagged: typeof groups[0] = { tag: null, loras: [] };
  
  props.loras.forEach((lora, index) => {
    const tagName = lora.tag || '';
    if (!tagName) {
      untagged.loras.push({ ...lora, originalIndex: index });
    } else {
      if (!tagMap.has(tagName)) {
        const tagInfo = props.tags.find(t => t.name === tagName);
        tagMap.set(tagName, {
          tag: tagInfo || { name: tagName, collapsed: false, loraCount: 0 },
          loras: []
        });
      }
      tagMap.get(tagName)!.loras.push({ ...lora, originalIndex: index });
    }
  });
  
  // Build ordered groups based on tag order
  for (const tag of props.tags) {
    const group = tagMap.get(tag.name);
    if (group) {
      groups.push(group);
    }
  }
  
  // Add untagged at the end if not empty
  if (untagged.loras.length > 0) {
    groups.push(untagged);
  }
  
  return groups;
});

// Event handlers
function handleToggleEnabled(originalIndex: number) {
  const lora = props.loras[originalIndex];
  if (lora) {
    emit('toggle-enabled', originalIndex, !lora.enabled);
  }
}

function handleStateUpdate(originalIndex: number, newState: LoraWidgetState) {
  const config = newState.config;
  emit('change-strength', originalIndex, config.strength_model, false);
  if (config.strength_clip !== config.strength_model) {
    emit('change-strength', originalIndex, config.strength_clip, true);
  }
}

function handleRemove(originalIndex: number) {
  emit('remove-lora', originalIndex);
}

function handleCopyTriggerWords(originalIndex: number) {
  emit('copy-trigger-words', originalIndex);
}

function handleTagToggle(tagName: string) {
  const tag = props.tags.find(t => t.name === tagName);
  if (tag) {
    emit('toggle-tag', tagName, !tag.collapsed);
  }
}

function handleAddLora(tagName?: string) {
  emit('add-lora', tagName);
}

// Drag and drop
function handleDragStart(index: number) {
  draggedIndex.value = index;
}

function handleDragOver(index: number, e: DragEvent) {
  e.preventDefault();
  dropTargetIndex.value = index;
}

function handleDrop(index: number) {
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    emit('reorder-lora', draggedIndex.value, index);
  }
  draggedIndex.value = null;
  dropTargetIndex.value = null;
}

function handleDragEnd() {
  draggedIndex.value = null;
  dropTargetIndex.value = null;
}
</script>

<template>
  <div class="super-lora-node-view">
    <!-- Empty state -->
    <div v-if="!loras.length" class="empty-state">
      <span class="empty-message">No LoRAs added</span>
      <button class="add-lora-btn" @click="handleAddLora()">
        + Add LoRA
      </button>
    </div>
    
    <!-- LoRA list (grouped or flat) -->
    <div v-else class="lora-list">
      <template v-for="(group, groupIndex) in groupedLoras" :key="groupIndex">
        <!-- Tag header (if tags enabled and tag exists) -->
        <TagHeader
          v-if="group.tag && tagsEnabled"
          :state="toTagHeaderState(group.tag)"
          @toggle="() => handleTagToggle(group.tag!.name)"
          @add="handleAddLora(group.tag!.name)"
        />
        
        <!-- LoRA rows -->
        <template v-if="!group.tag?.collapsed">
          <LoraRow
            v-for="lora in group.loras"
            :key="lora.originalIndex"
            :state="toLoraWidgetState(lora, lora.originalIndex)"
            :show-tags="false"
            :show-trigger-words="true"
            :class="{
              'dragging': draggedIndex === lora.originalIndex,
              'drop-target': dropTargetIndex === lora.originalIndex
            }"
            @toggle-enabled="() => handleToggleEnabled(lora.originalIndex)"
            @update:state="(s) => handleStateUpdate(lora.originalIndex, s)"
            @remove="() => handleRemove(lora.originalIndex)"
            @copy-trigger-words="() => handleCopyTriggerWords(lora.originalIndex)"
            @dragstart="() => handleDragStart(lora.originalIndex)"
            @dragover="(e: DragEvent) => handleDragOver(lora.originalIndex, e)"
            @drop="() => handleDrop(lora.originalIndex)"
            @dragend="handleDragEnd"
          />
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.super-lora-node-view {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  background-color: var(--comfy-input-bg, #1a1a2e);
  border-radius: 4px;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 12px;
  color: var(--comfy-text-color, #e0e0e0);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  gap: 10px;
}

.empty-message {
  color: var(--comfy-text-muted, #888);
  font-style: italic;
}

.add-lora-btn {
  background-color: var(--comfy-primary-color, #4a9eff);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.15s ease;
}

.add-lora-btn:hover {
  background-color: var(--comfy-primary-hover, #3a8eef);
}

.lora-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Drag and drop states */
.dragging {
  opacity: 0.5;
}

.drop-target {
  border-color: var(--comfy-primary-color, #4a9eff) !important;
  box-shadow: 0 0 4px var(--comfy-primary-color, #4a9eff);
}
</style>
