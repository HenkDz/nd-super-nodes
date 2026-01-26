<template>
  <div 
    class="lora-row"
    :class="{ 
      'lora-row--disabled': !state.config.enabled,
      'lora-row--dragging': state.ui.dragging,
      'lora-row--hovered': state.ui.hovered
    }"
    @mouseenter="state.ui.hovered = true"
    @mouseleave="state.ui.hovered = false"
  >
    <!-- Enable/Disable Toggle -->
    <button 
      class="lora-toggle"
      :class="{ 'lora-toggle--enabled': state.config.enabled }"
      @click="toggleEnabled"
      :aria-pressed="state.config.enabled"
      title="Toggle LoRA"
    >
      <span class="lora-toggle__indicator">●</span>
    </button>

    <!-- Tag Chip (when tags enabled) -->
    <button 
      v-if="showTags"
      class="lora-tag-chip"
      @click="emit('select-tag')"
      :title="`Tag: ${state.config.tag}`"
    >
      🏷
    </button>

    <!-- LoRA Name -->
    <button 
      class="lora-name"
      @click="emit('select-lora')"
      :title="state.config.lora"
    >
      {{ displayName }}
    </button>

    <!-- Trigger Words (when enabled) -->
    <div 
      v-if="showTriggerWords" 
      class="lora-trigger"
      @click="emit('edit-trigger')"
    >
      <span v-if="state.config.trigger_word" class="lora-trigger__text">
        {{ state.config.trigger_word }}
      </span>
      <span v-else class="lora-trigger__placeholder">
        Click to add trigger words...
      </span>
      <button 
        class="lora-trigger__refresh"
        :class="triggerIndicatorClass"
        @click.stop="emit('refresh-trigger')"
        title="Refresh trigger words from CivitAI"
      >
        ↻
      </button>
    </div>

    <!-- Move Controls (when enabled) -->
    <div v-if="showMoveArrows" class="lora-move">
      <button 
        class="lora-move__btn"
        :disabled="!canMoveUp"
        @click="emit('move-up')"
        title="Move up"
      >
        ▲
      </button>
      <button 
        class="lora-move__btn"
        :disabled="!canMoveDown"
        @click="emit('move-down')"
        title="Move down"
      >
        ▼
      </button>
    </div>

    <!-- CLIP Strength (when separate strengths enabled) -->
    <div v-if="showSeparateStrengths" class="lora-strength lora-strength--clip">
      <button class="lora-strength__btn" @click="emit('decrease-clip')">−</button>
      <button 
        class="lora-strength__value lora-strength__value--clip"
        @click="emit('edit-clip-strength')"
        :title="`CLIP strength: ${state.config.strength_clip.toFixed(2)}`"
      >
        {{ state.config.strength_clip.toFixed(2) }}
      </button>
      <button class="lora-strength__btn" @click="emit('increase-clip')">+</button>
    </div>

    <!-- Model Strength -->
    <div v-if="showStrength" class="lora-strength lora-strength--model">
      <button class="lora-strength__btn" @click="emit('decrease-model')">−</button>
      <button 
        class="lora-strength__value lora-strength__value--model"
        @click="emit('edit-model-strength')"
        :title="`Model strength: ${state.config.strength_model.toFixed(2)}`"
      >
        {{ state.config.strength_model.toFixed(2) }}
      </button>
      <button class="lora-strength__btn" @click="emit('increase-model')">+</button>
    </div>

    <!-- Remove Button -->
    <button 
      v-if="showRemove"
      class="lora-remove"
      @click="emit('remove')"
      title="Remove LoRA"
    >
      🗑
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LoraWidgetState } from '@/types';

// Props
const props = defineProps<{
  state: LoraWidgetState;
  showTags?: boolean;
  showTriggerWords?: boolean;
  showMoveArrows?: boolean;
  showStrength?: boolean;
  showSeparateStrengths?: boolean;
  showRemove?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}>();

// Emits
const emit = defineEmits<{
  (e: 'toggle-enabled'): void;
  (e: 'select-lora'): void;
  (e: 'select-tag'): void;
  (e: 'edit-trigger'): void;
  (e: 'refresh-trigger'): void;
  (e: 'move-up'): void;
  (e: 'move-down'): void;
  (e: 'decrease-model'): void;
  (e: 'increase-model'): void;
  (e: 'edit-model-strength'): void;
  (e: 'decrease-clip'): void;
  (e: 'increase-clip'): void;
  (e: 'edit-clip-strength'): void;
  (e: 'remove'): void;
  (e: 'update:state', state: LoraWidgetState): void;
}>();

// Computed
const displayName = computed(() => {
  if (props.state.config.lora === 'None') {
    return 'Click to select LoRA...';
  }
  // Truncate long names for display
  const name = props.state.config.lora;
  return name.length > 40 ? name.slice(0, 37) + '...' : name;
});

const triggerIndicatorClass = computed(() => {
  const hasTrigger = !!props.state.config.trigger_word?.trim();
  const isAuto = props.state.config.auto_populated;
  
  if (hasTrigger && isAuto) return 'lora-trigger__refresh--auto';
  if (hasTrigger && !isAuto) return 'lora-trigger__refresh--manual';
  return 'lora-trigger__refresh--empty';
});

// Methods
function toggleEnabled() {
  emit('toggle-enabled');
  // Also emit state update for two-way binding
  emit('update:state', {
    ...props.state,
    config: {
      ...props.state.config,
      enabled: !props.state.config.enabled
    }
  });
}
</script>

<style scoped lang="scss">
.lora-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #2a2a2a;
  border-radius: 6px;
  border: 1px solid #3a3a3a;
  min-height: 28px;
  
  &--disabled {
    opacity: 0.6;
    
    .lora-name,
    .lora-trigger__text {
      color: #888;
    }
  }
  
  &--hovered {
    border-color: #4a4a4a;
  }
  
  &--dragging {
    opacity: 0.8;
    border-color: #ffd700;
  }
}

.lora-toggle {
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid #3a3a3a;
  border-radius: 2px;
  background: #2a2a2a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &--enabled {
    border-color: #1b5e20;
    
    .lora-toggle__indicator {
      color: #2e7d32;
    }
  }
  
  &__indicator {
    font-size: 12px;
    color: transparent;
  }
}

.lora-tag-chip {
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid #444;
  border-radius: 2px;
  background: #333;
  cursor: pointer;
  font-size: 12px;
  flex-shrink: 0;
}

.lora-name {
  flex: 1;
  min-width: 100px;
  padding: 2px 4px;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  &:hover {
    color: #ffd700;
  }
}

.lora-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: #2f2f2f;
  border-radius: 3px;
  min-width: 80px;
  max-width: 150px;
  cursor: pointer;
  
  &__text,
  &__placeholder {
    flex: 1;
    font-size: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  &__text {
    color: #fff;
  }
  
  &__placeholder {
    color: #888;
  }
  
  &__refresh {
    width: 14px;
    height: 14px;
    padding: 0;
    border: none;
    border-radius: 50%;
    font-size: 10px;
    cursor: pointer;
    flex-shrink: 0;
    
    &--auto {
      background: rgba(40, 167, 69, 0.85);
      color: #111;
    }
    
    &--manual {
      background: rgba(74, 158, 255, 0.85);
      color: #111;
    }
    
    &--empty {
      background: rgba(160, 160, 160, 0.7);
      color: #111;
    }
  }
}

.lora-move {
  display: flex;
  flex-direction: column;
  gap: 2px;
  
  &__btn {
    width: 20px;
    height: 10px;
    padding: 0;
    border: none;
    border-radius: 2px;
    background: #555;
    color: #fff;
    font-size: 8px;
    cursor: pointer;
    
    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    
    &:not(:disabled):hover {
      background: #666;
    }
  }
}

.lora-strength {
  display: flex;
  align-items: center;
  gap: 2px;
  
  &__btn {
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    border-radius: 2px;
    background: #666;
    color: #fff;
    font-size: 12px;
    cursor: pointer;
    
    &:hover {
      background: #777;
    }
  }
  
  &__value {
    width: 50px;
    height: 20px;
    padding: 0 4px;
    border: 1px solid #4a4a4a;
    border-radius: 3px;
    font-size: 12px;
    text-align: center;
    cursor: pointer;
    
    &--model {
      background: #3b2a4a;
      color: #e5e5e5;
    }
    
    &--clip {
      background: #4a3f1f;
      color: #e5e5e5;
    }
  }
}

.lora-remove {
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid #5a3a3a;
  border-radius: 2px;
  background: #3a2a2a;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
  
  &:hover {
    background: #4a3a3a;
    border-color: #6a4a4a;
  }
}
</style>
