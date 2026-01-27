import { defineComponent, computed, createElementBlock, openBlock, normalizeClass, createElementVNode, createCommentVNode, toDisplayString, withModifiers, ref, Fragment, renderList, createBlock } from "vue";
const _hoisted_1$2 = ["aria-pressed"];
const _hoisted_2$2 = ["title"];
const _hoisted_3$2 = ["title"];
const _hoisted_4$1 = {
  key: 0,
  class: "lora-trigger__text"
};
const _hoisted_5 = {
  key: 1,
  class: "lora-trigger__placeholder"
};
const _hoisted_6 = {
  key: 2,
  class: "lora-move"
};
const _hoisted_7 = ["disabled"];
const _hoisted_8 = ["disabled"];
const _hoisted_9 = {
  key: 3,
  class: "lora-strength lora-strength--clip"
};
const _hoisted_10 = ["title"];
const _hoisted_11 = {
  key: 4,
  class: "lora-strength lora-strength--model"
};
const _hoisted_12 = ["title"];
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "LoraRow",
  props: {
    state: {},
    showTags: { type: Boolean },
    showTriggerWords: { type: Boolean },
    showMoveArrows: { type: Boolean },
    showStrength: { type: Boolean },
    showSeparateStrengths: { type: Boolean },
    showRemove: { type: Boolean },
    canMoveUp: { type: Boolean },
    canMoveDown: { type: Boolean }
  },
  emits: ["toggle-enabled", "select-lora", "select-tag", "edit-trigger", "refresh-trigger", "move-up", "move-down", "decrease-model", "increase-model", "edit-model-strength", "decrease-clip", "increase-clip", "edit-clip-strength", "remove", "update:state"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const displayName = computed(() => {
      if (props.state.config.lora === "None") {
        return "Click to select LoRA...";
      }
      const name = props.state.config.lora;
      return name.length > 40 ? name.slice(0, 37) + "..." : name;
    });
    const triggerIndicatorClass = computed(() => {
      const hasTrigger = !!props.state.config.trigger_word?.trim();
      const isAuto = props.state.config.auto_populated;
      if (hasTrigger && isAuto) return "lora-trigger__refresh--auto";
      if (hasTrigger && !isAuto) return "lora-trigger__refresh--manual";
      return "lora-trigger__refresh--empty";
    });
    function toggleEnabled() {
      emit("toggle-enabled");
      emit("update:state", {
        ...props.state,
        config: {
          ...props.state.config,
          enabled: !props.state.config.enabled
        }
      });
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["lora-row", {
          "lora-row--disabled": !__props.state.config.enabled,
          "lora-row--dragging": __props.state.ui.dragging,
          "lora-row--hovered": __props.state.ui.hovered
        }]),
        onMouseenter: _cache[13] || (_cache[13] = ($event) => __props.state.ui.hovered = true),
        onMouseleave: _cache[14] || (_cache[14] = ($event) => __props.state.ui.hovered = false)
      }, [
        createElementVNode("button", {
          class: normalizeClass(["lora-toggle", { "lora-toggle--enabled": __props.state.config.enabled }]),
          onClick: toggleEnabled,
          "aria-pressed": __props.state.config.enabled,
          title: "Toggle LoRA"
        }, [..._cache[15] || (_cache[15] = [
          createElementVNode("span", { class: "lora-toggle__indicator" }, "●", -1)
        ])], 10, _hoisted_1$2),
        __props.showTags ? (openBlock(), createElementBlock("button", {
          key: 0,
          class: "lora-tag-chip",
          onClick: _cache[0] || (_cache[0] = ($event) => emit("select-tag")),
          title: `Tag: ${__props.state.config.tag}`
        }, " 🏷 ", 8, _hoisted_2$2)) : createCommentVNode("", true),
        createElementVNode("button", {
          class: "lora-name",
          onClick: _cache[1] || (_cache[1] = ($event) => emit("select-lora")),
          title: __props.state.config.lora
        }, toDisplayString(displayName.value), 9, _hoisted_3$2),
        __props.showTriggerWords ? (openBlock(), createElementBlock("div", {
          key: 1,
          class: "lora-trigger",
          onClick: _cache[3] || (_cache[3] = ($event) => emit("edit-trigger"))
        }, [
          __props.state.config.trigger_word ? (openBlock(), createElementBlock("span", _hoisted_4$1, toDisplayString(__props.state.config.trigger_word), 1)) : (openBlock(), createElementBlock("span", _hoisted_5, " Click to add trigger words... ")),
          createElementVNode("button", {
            class: normalizeClass(["lora-trigger__refresh", triggerIndicatorClass.value]),
            onClick: _cache[2] || (_cache[2] = withModifiers(($event) => emit("refresh-trigger"), ["stop"])),
            title: "Refresh trigger words from CivitAI"
          }, " ↻ ", 2)
        ])) : createCommentVNode("", true),
        __props.showMoveArrows ? (openBlock(), createElementBlock("div", _hoisted_6, [
          createElementVNode("button", {
            class: "lora-move__btn",
            disabled: !__props.canMoveUp,
            onClick: _cache[4] || (_cache[4] = ($event) => emit("move-up")),
            title: "Move up"
          }, " ▲ ", 8, _hoisted_7),
          createElementVNode("button", {
            class: "lora-move__btn",
            disabled: !__props.canMoveDown,
            onClick: _cache[5] || (_cache[5] = ($event) => emit("move-down")),
            title: "Move down"
          }, " ▼ ", 8, _hoisted_8)
        ])) : createCommentVNode("", true),
        __props.showSeparateStrengths ? (openBlock(), createElementBlock("div", _hoisted_9, [
          createElementVNode("button", {
            class: "lora-strength__btn",
            onClick: _cache[6] || (_cache[6] = ($event) => emit("decrease-clip"))
          }, "−"),
          createElementVNode("button", {
            class: "lora-strength__value lora-strength__value--clip",
            onClick: _cache[7] || (_cache[7] = ($event) => emit("edit-clip-strength")),
            title: `CLIP strength: ${__props.state.config.strength_clip.toFixed(2)}`
          }, toDisplayString(__props.state.config.strength_clip.toFixed(2)), 9, _hoisted_10),
          createElementVNode("button", {
            class: "lora-strength__btn",
            onClick: _cache[8] || (_cache[8] = ($event) => emit("increase-clip"))
          }, "+")
        ])) : createCommentVNode("", true),
        __props.showStrength ? (openBlock(), createElementBlock("div", _hoisted_11, [
          createElementVNode("button", {
            class: "lora-strength__btn",
            onClick: _cache[9] || (_cache[9] = ($event) => emit("decrease-model"))
          }, "−"),
          createElementVNode("button", {
            class: "lora-strength__value lora-strength__value--model",
            onClick: _cache[10] || (_cache[10] = ($event) => emit("edit-model-strength")),
            title: `Model strength: ${__props.state.config.strength_model.toFixed(2)}`
          }, toDisplayString(__props.state.config.strength_model.toFixed(2)), 9, _hoisted_12),
          createElementVNode("button", {
            class: "lora-strength__btn",
            onClick: _cache[11] || (_cache[11] = ($event) => emit("increase-model"))
          }, "+")
        ])) : createCommentVNode("", true),
        __props.showRemove ? (openBlock(), createElementBlock("button", {
          key: 5,
          class: "lora-remove",
          onClick: _cache[12] || (_cache[12] = ($event) => emit("remove")),
          title: "Remove LoRA"
        }, " 🗑 ")) : createCommentVNode("", true)
      ], 34);
    };
  }
});
const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};
const LoraRow = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-f0163b44"]]);
const _hoisted_1$1 = { class: "tag-header__arrow" };
const _hoisted_2$1 = { class: "tag-header__name" };
const _hoisted_3$1 = { class: "tag-header__count" };
const _hoisted_4 = { class: "tag-header__actions" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "TagHeader",
  props: {
    state: {}
  },
  emits: ["toggle", "collapse-all", "expand-all", "drop", "update:state"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    function toggleCollapsed() {
      emit("toggle");
      emit("update:state", {
        ...props.state,
        collapsed: !props.state.collapsed
      });
    }
    function handleDrop(event) {
      props.state.ui.dragOver = false;
      const data = event.dataTransfer?.getData("application/json");
      if (data) {
        try {
          emit("drop", JSON.parse(data));
        } catch {
        }
      }
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["tag-header", {
          "tag-header--collapsed": __props.state.collapsed,
          "tag-header--drag-over": __props.state.ui.dragOver
        }]),
        onClick: toggleCollapsed,
        onDragover: _cache[2] || (_cache[2] = withModifiers(($event) => __props.state.ui.dragOver = true, ["prevent"])),
        onDragleave: _cache[3] || (_cache[3] = ($event) => __props.state.ui.dragOver = false),
        onDrop: handleDrop
      }, [
        createElementVNode("span", _hoisted_1$1, toDisplayString(__props.state.collapsed ? "▶" : "▼"), 1),
        createElementVNode("span", _hoisted_2$1, toDisplayString(__props.state.tag), 1),
        createElementVNode("span", _hoisted_3$1, toDisplayString(__props.state.count), 1),
        createElementVNode("div", _hoisted_4, [
          createElementVNode("button", {
            class: "tag-header__action",
            onClick: _cache[0] || (_cache[0] = withModifiers(($event) => emit("collapse-all"), ["stop"])),
            title: "Collapse all tags"
          }, " ⏫ "),
          createElementVNode("button", {
            class: "tag-header__action",
            onClick: _cache[1] || (_cache[1] = withModifiers(($event) => emit("expand-all"), ["stop"])),
            title: "Expand all tags"
          }, " ⏬ ")
        ])
      ], 34);
    };
  }
});
const TagHeader = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-961f13a8"]]);
const _hoisted_1 = { class: "super-lora-node-view" };
const _hoisted_2 = {
  key: 0,
  class: "empty-state"
};
const _hoisted_3 = {
  key: 1,
  class: "lora-list"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "SuperLoraNodeView",
  props: {
    loras: {},
    tags: {},
    tagsEnabled: { type: Boolean },
    showSeparateStrengths: { type: Boolean },
    nodeId: {}
  },
  emits: ["toggle-enabled", "change-strength", "remove-lora", "copy-trigger-words", "toggle-tag", "add-lora", "reorder-lora"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const draggedIndex = ref(null);
    const dropTargetIndex = ref(null);
    function toLoraWidgetState(lora, index) {
      return {
        id: `lora-${index}`,
        config: {
          lora: lora.name,
          enabled: lora.enabled,
          strength_model: lora.strength,
          strength_clip: lora.clipStrength,
          tag: lora.tag || "",
          trigger_word: (lora.triggerWords || []).join(", "),
          auto_populated: false
        },
        ui: {
          expanded: false,
          hovered: false,
          dragging: draggedIndex.value === index,
          loading: lora.isLoading || false,
          error: void 0
        }
      };
    }
    function toTagHeaderState(tag) {
      return {
        tag: tag.name,
        collapsed: tag.collapsed,
        count: tag.loraCount,
        ui: {
          hovered: false,
          dragOver: false
        }
      };
    }
    const groupedLoras = computed(() => {
      if (!props.tagsEnabled || !props.tags.length) {
        return [{ tag: null, loras: props.loras.map((l, i) => ({ ...l, originalIndex: i })) }];
      }
      const groups = [];
      const tagMap = /* @__PURE__ */ new Map();
      const untagged = { tag: null, loras: [] };
      props.loras.forEach((lora, index) => {
        const tagName = lora.tag || "";
        if (!tagName) {
          untagged.loras.push({ ...lora, originalIndex: index });
        } else {
          if (!tagMap.has(tagName)) {
            const tagInfo = props.tags.find((t) => t.name === tagName);
            tagMap.set(tagName, {
              tag: tagInfo || { name: tagName, collapsed: false, loraCount: 0 },
              loras: []
            });
          }
          tagMap.get(tagName).loras.push({ ...lora, originalIndex: index });
        }
      });
      for (const tag of props.tags) {
        const group = tagMap.get(tag.name);
        if (group) {
          groups.push(group);
        }
      }
      if (untagged.loras.length > 0) {
        groups.push(untagged);
      }
      return groups;
    });
    function handleToggleEnabled(originalIndex) {
      const lora = props.loras[originalIndex];
      if (lora) {
        emit("toggle-enabled", originalIndex, !lora.enabled);
      }
    }
    function handleStateUpdate(originalIndex, newState) {
      const config = newState.config;
      emit("change-strength", originalIndex, config.strength_model, false);
      if (config.strength_clip !== config.strength_model) {
        emit("change-strength", originalIndex, config.strength_clip, true);
      }
    }
    function handleRemove(originalIndex) {
      emit("remove-lora", originalIndex);
    }
    function handleCopyTriggerWords(originalIndex) {
      emit("copy-trigger-words", originalIndex);
    }
    function handleTagToggle(tagName) {
      const tag = props.tags.find((t) => t.name === tagName);
      if (tag) {
        emit("toggle-tag", tagName, !tag.collapsed);
      }
    }
    function handleAddLora(tagName) {
      emit("add-lora", tagName);
    }
    function handleDragStart(index) {
      draggedIndex.value = index;
    }
    function handleDragOver(index, e) {
      e.preventDefault();
      dropTargetIndex.value = index;
    }
    function handleDrop(index) {
      if (draggedIndex.value !== null && draggedIndex.value !== index) {
        emit("reorder-lora", draggedIndex.value, index);
      }
      draggedIndex.value = null;
      dropTargetIndex.value = null;
    }
    function handleDragEnd() {
      draggedIndex.value = null;
      dropTargetIndex.value = null;
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        !__props.loras.length ? (openBlock(), createElementBlock("div", _hoisted_2, [
          _cache[1] || (_cache[1] = createElementVNode("span", { class: "empty-message" }, "No LoRAs added", -1)),
          createElementVNode("button", {
            class: "add-lora-btn",
            onClick: _cache[0] || (_cache[0] = ($event) => handleAddLora())
          }, " + Add LoRA ")
        ])) : (openBlock(), createElementBlock("div", _hoisted_3, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(groupedLoras.value, (group, groupIndex) => {
            return openBlock(), createElementBlock(Fragment, { key: groupIndex }, [
              group.tag && __props.tagsEnabled ? (openBlock(), createBlock(TagHeader, {
                key: 0,
                state: toTagHeaderState(group.tag),
                onToggle: () => handleTagToggle(group.tag.name),
                onAdd: ($event) => handleAddLora(group.tag.name)
              }, null, 8, ["state", "onToggle", "onAdd"])) : createCommentVNode("", true),
              !group.tag?.collapsed ? (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(group.loras, (lora) => {
                return openBlock(), createBlock(LoraRow, {
                  key: lora.originalIndex,
                  state: toLoraWidgetState(lora, lora.originalIndex),
                  "show-tags": false,
                  "show-trigger-words": true,
                  class: normalizeClass({
                    "dragging": draggedIndex.value === lora.originalIndex,
                    "drop-target": dropTargetIndex.value === lora.originalIndex
                  }),
                  onToggleEnabled: () => handleToggleEnabled(lora.originalIndex),
                  "onUpdate:state": (s) => handleStateUpdate(lora.originalIndex, s),
                  onRemove: () => handleRemove(lora.originalIndex),
                  onCopyTriggerWords: () => handleCopyTriggerWords(lora.originalIndex),
                  onDragstart: () => handleDragStart(lora.originalIndex),
                  onDragover: (e) => handleDragOver(lora.originalIndex, e),
                  onDrop: () => handleDrop(lora.originalIndex),
                  onDragend: handleDragEnd
                }, null, 8, ["state", "class", "onToggleEnabled", "onUpdate:state", "onRemove", "onCopyTriggerWords", "onDragstart", "onDragover", "onDrop"]);
              }), 128)) : createCommentVNode("", true)
            ], 64);
          }), 128))
        ]))
      ]);
    };
  }
});
const SuperLoraNodeView = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-c255acb5"]]);
export {
  SuperLoraNodeView as default
};
//# sourceMappingURL=SuperLoraNodeView-ER6v5Q3t.js.map
