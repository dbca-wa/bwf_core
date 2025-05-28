/* eslint-disable prefer-spread */
/* eslint-disable no-plusplus */
BWF_SYNTAX = {
  template: "python",
  javascript: "javascript",
  text: "text",
};
class ValueSelector {
  constructor(element, settings, $) {
    const _ = this;
    const { markup } = utils;

    _.defaults = {
      name: "DBCA-BWF-VARIABLE-SELECTOR",
      theme: "default",
    };

    const {
      input,
      parent,
      component,
      portal,
      valueOnly,
      isEdition,
      useOutputFields,
      isRouting,
      onSave,
      onCancel,
    } = settings;

    if (!input || !component) {
      return;
    }

    const { json_value, data_type } = input;
    const { type, options, value_rules } = json_value || {};
    const { value_ref, value, is_expression, is_condition, editor_syntax } =
      input.value ?? {};

    _.component = component;
    _.input = input;
    _.parentInput = parent;
    _.isEdition = isEdition;
    _.editor_syntax = editor_syntax;
    _.useOutputFields = useOutputFields || false;
    _.isRouting = isRouting || false;
    _.portal = portal;
    _.parentComponentElement = $(`#routing-form, #node_panel_${component.id}`);
    _.select2 = null;
    _.tmpValue = null;

    _.initials = {
      present: true,
      valueOnly: valueOnly || false,
      value: value,
      value_ref: value_ref,
      type: type,
      options: options,
      value_rules: value_rules,
      is_expression: !!is_expression,
      is_condition: !!is_condition,
      showEditor: !!is_expression,
      editor_syntax: editor_syntax,
      onSave: onSave,
      onCancel: onCancel,
    };
    const elementSettings = {
      type,
      options,
      value_rules,
    };
    _.options = $.extend({}, _.defaults, elementSettings);

    $.extend(_, _.initials);
    _.$element = $(element);

    const content = markup("div", "", {
      "data-id": `${component.id}-${input.key}`,
      class: "value-selector-content me-1",
    });
    const resetButton = markup("button", [{ tag: "i", class: "bi bi-trash" }], {
      class: "btn btn-sm btn-outline-secondary value-selector-reset",
      type: "button",
    });
    const editButton = markup("button", [{ tag: "i", class: "bi bi-pencil" }], {
      class: "btn btn-sm btn-primary value-selector-edit me-1",
      type: "button",
    });
    _.$element.append(content);
    _.$element.append(editButton);
    _.$element.append(resetButton);

    _.$content = _.$element.find(".value-selector-content");
    _.$resetButton = _.$element.find(".value-selector-reset");
    _.$editButton = _.$element.find(".value-selector-edit");
    _.$saveButton = null;

    if (valueOnly) {
      _.$editButton.remove();
    }
    _.updateHtml();
    _.render(value, value_ref);
  }

  render(value, value_ref = {}) {
    const _ = this;
    const { markup } = utils;
    const $vars = workflow_variables;
    const { isEdition } = _;

    const isDisabled = !isEdition;

    const { options, value_rules, multi, structure } =
      _.input?.json_value ?? {};

    if (value_rules && value_rules.variable_only) {
      _.$content.empty();
      _.$resetButton.hide();
      _.$editButton.hide();
      const selectElement = markup(
        "select",
        [
          markup("option", "Select a variable", { value: "" }),
          ...$vars.var.variables.map((variable) => {
            const opts = {
              value: variable.id,
              "data-context": variable.context ?? "variables",
              "data-name": variable.name,
              "data-key": variable.key,
            };
            if (variable.id === value) {
              opts.selected = true;
            }
            return markup("option", variable.name, opts);
          }),
        ],
        {
          class: "form-select form-select-sm variables-select",
          value: value ?? "",
          disabled: isDisabled,
        }
      );
      _.$content.append(selectElement);

      $(selectElement).on(EVENT_VARIABLES_CHANGE, _, (event) => {
        const selector = event.data;
        selector.render(selector.input.value, {});
      });
      $(selectElement).on("change", _, function (event) {
        const selector = event.data;
        const selectedValue = event.target.value;
        selector.saveValue({
          value: selectedValue,
          is_expression: false,
          value_ref: null,
        });
      });
    } else if (options) {
      _.$content.empty();
      _.$resetButton.hide();
      _.$editButton.hide();

      const selectElement = markup(
        "select",
        [
          markup("option", "Select a variable", { value: "" }),
          ...options.map((option) => {
            const opts = { value: option.value };
            if (option.value === value) {
              opts.selected = true;
            }
            return markup("option", option.label, opts);
          }),
        ],
        {
          class: "form-select form-select-sm variables-select",
          value: value ?? "",
          disabled: isDisabled,
        }
      );
      _.$content.append(selectElement);

      $(selectElement).on("change", _, function (event) {
        const selector = event.data;
        const selectedValue = event.target.value;
        selector.saveValue({
          value: selectedValue,
          is_expression: false,
          value_ref: null,
        });
      });
    } else if (multi && structure) {
      _.$content.empty();
      _.$resetButton.hide();
      _.$editButton.hide();
      _.$content.addClass("multi-value-selector");

      const add_button = markup(
        "div",
        [
          { tag: "div", content: "&nbsp;", class: "col-3" },
          {
            tag: "div",
            content: markup(
              "button",
              [{ tag: "i", class: "bi bi-plus" }, "Add field value"],
              {
                class: "btn btn-primary btn-sm mb-4",
              }
            ),
            class: "col-9 d-grid",
          },
        ],
        { class: "row add-array-item" }
      );
      const fieldsElement = markup("div", "", {
        class: "fields w-100",
      });
      _.$content.append(fieldsElement);
      fieldsElement.append(add_button);

      const valueArray = _.input.value || [];
      for (let i = 0; i < valueArray.length; i++) {
        const item = valueArray[i];
        _.renderMultiValueInput(item);
      }

      $(add_button)
        .find("button")
        .on("click", _, function (event) {
          const selector = event.data;
          const { input, component } = selector;
          const { value } = input;
          const valueArray = value || [];
          const newValue = {};
          for (const structure_key in structure) {
            newValue[structure_key] = {
              ...structure[structure_key],
              id: `${component.id}__${
                input.key
              }__${structure_key}__${new Date().getTime()}`,
            };
          }
          selector.renderMultiValueInput(newValue);
          valueArray.push(newValue);
          selector.saveValue(valueArray);
        });
    } else {
      _.renderValueEditorBlock();
    }
  }

  widget() {
    console.warn("widget method is deprecated");
    return this;
  }

  renderMultiValueInput(inputValue) {
    const { markup } = utils;
    const selector = this;
    const { input, component } = selector;
    const extraButtons = [
      markup(
        "div",
        [
          markup("button", [{ tag: "i", class: "bi bi-x-circle" }], {
            class: "btn btn-sm btn-outline-danger value-item-remove",
          }),
        ],
        { class: "extra-buttons" }
      ),
    ];
    const field_identifier = `${component.id}__${
      input.key
    }__fields__${`${Math.random()}`.substring(2, 8)}`;

    for (const field in inputValue) {
      const field_input = inputValue[field];
      const elementId = `${field_input.id}`;
      const inputElement = workflow_components.getComponentInputElement({
        ...field_input,
        elementId: `${elementId}_${field}`,
      });
      const container = markup(
        "div",
        [
          markup(
            "div",
            markup("div", inputElement, { id: `${elementId}_array` }),
            {
              class: "",
            }
          ),
        ],
        {
          id: elementId,
          class: [
            "row justify-content-between single-field",
            field_identifier,
          ].join(" "),
        }
      );
      $(container).insertBefore(selector.$content.find(".add-array-item"));
      $(
        `#${elementId}.input-value, #${elementId}_array .input-value`
      ).valueSelector({
        input: field_input,
        component: component,
        parent: selector,
        isEdition: selector.isEdition,
        portal: selector.portal,
      });
      if (extraButtons.length > 0) {
        const elem = extraButtons.pop();
        $(elem).find("button").attr("data-key", field);
        $(elem).find("button").attr("data-id", field_input.id);
        $(elem).find("button").attr("data-field-id", field_identifier);
        $(`#${elementId}.input-value, #${elementId}_array .input-value`).append(
          $(elem)
        );
      }
      workflow_components.updateLines();
    }
    selector.$content.find(".fields > .single-field:last").addClass("mb-1");
    selector.$content
      .find(".fields button.value-item-remove")
      .on("click", selector, function (event) {
        const selector = event.data;
        const key = $(this).data("key");
        const id = $(this).data("id");
        const field_id = $(this).data("field-id");
        try {
          const value = selector.input.value.filter((v) => v[key].id !== id);
          selector.saveValue(value);
          input.value = value;
          $(`.${field_id}`).remove();
          workflow_components.updateLines();
        } catch (error) {
          console.error(error);
        }
      });
  }


  onPopoverOpen() {
    const _ = this;
    // console.log({ settings: _.initials });
    const { input, isEdition } = _;
    const { value, value_ref } = input.value ?? {};
    if ((!value || value_ref) && !_.initials.showEditor) {
      _.$saveButton?.hide();
    } else {
      _.$saveButton?.show();
    }

    if (!isEdition) {
      _.$saveButton?.hide();

      if (_.editor) {
        _.editor.setOption("readOnly", true);
      }
    }
  }
  renderValueEditorBlock() {
    const _ = this;
    const { input, isEdition } = _;

    const { value } = input.value ?? {};
    const { value_rules } = input?.json_value ?? {};

    const { ajax } = value_rules || {};
    const isAjax = ajax && !!ajax.url;

    _.$resetButton.off("click").on("click", _, function (event) {
      const selector = event.data;
      selector.saveValue({
        value: null,
        is_expression: false,
        value_ref: null,
      });
    });
    if (value) {
      _.$resetButton.show();
    } else {
      // _.$resetButton.off("click");
      _.$resetButton.hide();
      if (isAjax && !_.select2) {
        _.$content.empty();
        _.renderAjaxSelect();
      }
    }
    _.$editButton.show();

    _.$editButton.off("click").on("click", _, function (event) {
      const selector = event.data;
      _.initials.showEditor = true;
      if (selector.popover) {
        selector.popover?.dispose();
        selector.popover = null;
      }
      selector.onContentEditionRendered();
    });

    if (!isEdition) {
      _.$editButton.hide();
      _.$resetButton.hide();
    }

    if (!isAjax) _.$content.addClass("value-selector");

    _.$content.off("click").on("click", _, function (event) {
      const selector = event.data;
      const { value } = selector.input.value ?? {};

      if (!value && _.initials.showEditor) {
        _.initials.showEditor = false;
        if (!selector.popover && !isAjax) {
          selector.renderVariablesMenuPopover();
        }
        return;
      }
      if (isAjax && !_.initials.showEditor) {
        if (value) {
          _.$content.addClass("value-selector");
          _.$resetButton.show();
          _.$editButton.show();
          if (selector.select2) {
            selector.select2.select2("open");
          } else {
            selector.renderAjaxSelect();
            selector.select2.select2("open");
          }
        }
      }
      if (!selector.popover && _.initials.showEditor) {
        selector.onContentEditionRendered();
      }
    });

    if (!_.initials.showEditor && !ajax) {
      _.renderVariablesMenuPopover();
    }
  }
  renderAjaxSelect() {
    const _ = this;
    const { markup } = utils;

    const { input } = _;
    const { value, value_ref } = input.value ?? {};
    const { value_rules } = _.input?.json_value ?? {};

    const { ajax } = value_rules || {};
    if (!ajax) {
      return;
    }

    const { url } = ajax;

    if ((!value || value_ref) && !_.initials.showEditor) {
      _.$saveButton?.hide();
    } else {
      _.$saveButton?.show();
    }
    _.$content.removeClass("value-selector");
    _.$content.empty();
    _.$resetButton.hide();
    _.$editButton.hide();
    const inputElement = markup("div", "", {
      class: "form-select form-select-sm variables-select",
      // value: value ?? "",
      // disabled: isDisabled,
    });

    _.$content.append(inputElement);

    const base_plugin_url = workflow_components.var.base_plugin_url;
    const ajax_url = (base_plugin_url + url)
      .replace(/\/\//g, "/")
      .replace(/\/$/, "");
    if (!_.select2) {
      _.select2 = $(inputElement).select2({
        dropdownParent: $("#component-side-panel > .offcanvas-body"),
        ajax: {
          url: ajax_url,
          dataType: "json",
          delay: 300,
          headers: { "X-CSRFToken": $("#csrf_token").val() },
          data: function (params) {
            var query = {
              filter: params.term,
              page: params.page,
            };
            return query;
          },
          processResults: function (data, params) {
            params.page = params.page || 1;
            return {
              results: data.map((item) => ({
                id: item.id,
                text: item.name,
              })),
            };
          },

          // Additional AJAX parameters go here; see the end of this chapter for the full code of this example
        },
      });
      _.select2.on("select2:close", _, function (e) {
        const selector = e.data;
        const { originalSelect2Event } = e.params;
        if (!originalSelect2Event) {
          selector.renderValueEditorBlock();
        }
      });
    }
    $(inputElement).on("select2:select", _, function (event) {
      const selector = event.data;
      const data = event.params.data;
      selector.saveValue({
        value: { id: data.id, name: data.text },
        is_expression: false,
        value_ref: null,
      });

      selector.select2?.select2("destroy");
      selector.select2 = null;
    });
  }
  onContentEditionRendered() {
    const _ = this;
    const { input, component, isEdition, useOutputFields } = _;
    const { data_type } = input;
    const { value, value_ref, is_expression, editor_syntax } =
      input.value ?? {};
    _.parentComponentElement.hide();
    if (!_.isRouting) $("#routing-component").hide();

    _.parentComponentElement.addClass("in-edition");
    $(".value-in-edition").removeClass("value-in-edition");
    _.$content.addClass("value-in-edition");

    const editorBlockContent = $('[data-name="editor-content"]').clone();
    _.$saveButton = editorBlockContent.find(".btn-save");
    editorBlockContent.find("code.label").html(input.name);
    editorBlockContent.find("code.data-type").html(`[${input.data_type}]`);
    editorBlockContent.attr("data-name", null);
    editorBlockContent.attr(
      "id",
      `editor-content-${component.id}-${input.key}`
    );
    editorBlockContent
      .find(".context-menu")
      .attr("id", `context-menu-${component.id}-${input.key}`);

    _.$saveButton.on("click", _, function (event) {
      const selector = event.data;
      const selectedValue = selector.editor?.getValue();

      if (selector.validateValueEntered(selectedValue)) {
        if (data_type === "boolean") {
          selector.saveValue({
            value: selector.tmpValue,
            is_expression: false,
            is_condition: true,
            value_ref: null,
          });
        } else {
          selector.hideContentEdition();

          selector.saveValue({
            value: selector.tansformValue(selectedValue),
            is_expression: true,
            value_ref: null,
          });
        }
      } else {
        if (data_type === "boolean") {
          utils.toast.showError("Please check the condition values.", "");
        } else {
          utils.toast.showError(
            "Please check the value.",
            "Invalid value entered"
          );
        }
      }
    });

    editorBlockContent.find(".btn-close").on("click", _, function (event) {
      const selector = event.data;
      const { value } = selector.input.value ?? {};
      selector.editor?.setValue(
        typeof (value?.value ?? {}) === "string"
          ? value
          : JSON.stringify(value?.value ?? "")
      );
      selector.hideContentEdition();
    });
    editorBlockContent.find(".btn-clear").on("click", _, function (event) {
      const selector = event.data;
      selector.saveValue({
        value: null,
        is_expression: false,
        value_ref: null,
      });
    });

    if (_.initials.showEditor) {
      _.portal.empty().append(editorBlockContent);
      if (data_type === "boolean") {
        _.setUpConditionsEditor(_.portal.find(".conditions-editor")[0]);
      } else {
        _.setUpEditor(_.portal.find(".editor")[0]);
      }
    }
    if ((!value || value_ref) && !_.initials.showEditor) {
      _.$saveButton.hide();
    } else {
      _.$saveButton.show();
    }

    if (_.editor) {
      if (!value && !value_ref) {
        _.editor.setValue("");
      }

      if (value) {
        _.editor.setValue(
          typeof value === "string" ? value : JSON.stringify(value)
        );
      }
      if (!value && value_ref) {
        _.editor.setValue(
          `{{${value_ref.context}${utils.replace_context_key(value_ref.key)}}}`
        );
      }
    }
    if (!isEdition) {
      _.$saveButton.hide();
      editorBlockContent.find(".btn-clear").hide();

      if (_.editor) {
        _.editor.setOption("readOnly", true);
      }
    }

    $(`#context-menu-${component.id}-${input.key}`).contextMenu({
      input,
      component,
      isEdition,
      showInPopover: !!is_expression || _.initials.showEditor,
      useOutputFields,
      onCancel: () => {
        _.popover?.hide();
      },
      onSelectValue: (selectedValue) => {
        const { convert_context_to_python_dict } = utils;

        if (!isEdition) return;
        const contextValue = convert_context_to_python_dict(
          selectedValue?.context
        );
        if (_.initials.showEditor && _.editor) {
          const doc = _.editor.getDoc();
          const cursor = doc.getCursor();
          // ensures lists will be safely replaced
          let suffix = "";
          if (selectedValue.dataType === "array") suffix = `|safe`;
          doc.replaceRange(
            `{{${contextValue}${utils.replace_context_key(
              selectedValue?.key
            )}${suffix}}}`,
            cursor
          );
        } else {
          _.saveValue({
            value: null,
            is_expression: false,
            value_ref: {
              context: contextValue,
              key: selectedValue.key,
              id: selectedValue.id,
            },
          });
        }
      },
    });
  }
  hideContentEdition() {
    const _ = this;
    _.popover?.hide();
    _.parentComponentElement.show();
    _.parentComponentElement.removeClass("in-edition");
    $(".value-in-edition").removeClass("value-in-edition");
    $(`#routing-component`).show();

    component_utils.closePopovers(_);
    _.portal?.empty();
  }
  renderVariablesMenuPopover() {
    const _ = this;
    const { input, component, isEdition, useOutputFields } = _;
    const popoverContent = $('[data-name="popover-content"]').clone();
    popoverContent.find(".btn-save").hide();

    popoverContent.attr("data-name", null);
    popoverContent.attr("id", `popover-content-${component.id}-${input.key}`);
    popoverContent
      .find(".context-menu")
      .attr("id", `context-menu-${component.id}-${input.key}`);
    popoverContent.find(".btn-close").on("click", _, function (event) {
      const selector = event.data;
      selector.popover?.hide();
    });
    // POPOVER
    const popoverOptions = {
      html: true,
      content: popoverContent,
      offset: [0, -2],
      placement: "bottom",
      container: "#component-side-panel > .offcanvas-body",
      customClass: "popover-value-selector",
    };

    if (_.isEdition) {
      _.popover = new bootstrap.Popover(_.$content, popoverOptions);
    }

    _.$content.on("shown.bs.popover", _, function (event) {
      const _ = event.data;
      const { input, component } = _;
      const { is_expression } = input.value ?? {};
      const { convert_context_to_python_dict } = utils;

      $(`#context-menu-${component.id}-${input.key}`).contextMenu({
        input,
        component,
        isEdition,
        useOutputFields,
        showInPopover: !!is_expression || _.initials.showEditor,
        onSelectValue: (selectedValue) => {
          if (!isEdition) return;
          const contextValue = convert_context_to_python_dict(
            selectedValue?.context
          );
          if (_.initials.showEditor && _.editor) {
            const doc = _.editor.getDoc();
            const cursor = doc.getCursor();
            let suffix = "";
            if (selectedValue.dataType === "array") suffix = `|safe`;
            doc.replaceRange(
              `{{${contextValue}${utils.replace_context_key(
                selectedValue?.key
              )}${suffix}}}`,
              cursor
            );
          } else {
            _.saveValue({
              value: null,
              is_expression: false,
              value_ref: {
                context: contextValue,
                key: selectedValue.key,
                id: selectedValue.id,
              },
            });
          }
        },
        onCancel: () => {
          _.popover?.hide();
        },
      });
    });
    _.$content.on("show.bs.popover", _, function (event) {
      component_utils.closePopovers(_);
      const selector = event.data;
      selector.onPopoverOpen();
    });
  }

  setUpConditionsEditor(container) {
    const _ = this;
    const { input } = _;
    const { value } = input.value || [];
    $(container).show();
    _.tmpValue = [];
    if (value.length === 0) {
      _.renderConditionRow($(container).find(".conditions-block"), {
        left_value: null,
        condition: "equals",
        right_value: null,
        operand: "and",
      });
    } else {
      for (let i = 0; i < value.length; i++) {
        const condition = value[i];
        _.renderConditionRow(
          $(container).find(".conditions-block"),
          condition
        );
      }
    }

    $(container).find(".btn-add-condition").attr("data-");
    const conditionsBlock = $(container).find(".conditions-block");
    $(container)
      .find(".btn-add-condition")
      .on("click", { selector: _, conditionsBlock }, function (event) {
        const { selector, conditionsBlock } = event.data;
        selector.renderConditionRow(
          conditionsBlock,
          {
            left_value: null,
            condition: "equals",
            right_value: null,
            operand: "and",
          }
        );
      });
  }

  setUpEditor(element) {
    const _ = this;
    const { input } = _;
    const { value, value_ref } = input.value ?? {};
    const { data_type } = input;

    _.editor = CodeMirror.fromTextArea(element, {
      doc: "Start document",
      value: "",
      mode: { name: "python", version: 3, singleLineStringErrors: false },
      theme: "default",
      lineNumbers: true,
      indentUnit: 4,
      styleActiveLine: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      lineWrapping: true,
      lint: true,
      gutters: ["CodeMirror-lint-markers"],
    });
    if (value) {
      _.editor.setValue(
        typeof value === "string" ? value : JSON.stringify(value)
      );
    }
    if (!value && value_ref) {
      _.editor.setValue(
        `{{${value_ref.context}${utils.replace_context_key(value_ref.key)}}}`
      );
    }

    if (!["array", "object"].includes(data_type)) {
      _.portal.find("#editor-syntax").hide();
    } else {
      _.portal.find("#editor-syntax").show();
      const syntax = input.editor_syntax || BWF_SYNTAX.javascript;
      _.portal.find("#editor-syntax").val(syntax);
    }

    _.portal.find("#editor-syntax").on("change", _, function (event) {
      const selector = event.data;
      const syntax = event.target.value;
      if (selector.editor) {
        // TODO
        selector.editor.setOption("mode", syntax);
      }
      selector.editor_syntax = syntax;
      // selector.updateValue(selector.input.value, selector.input.json_value);
    });

    _.editor.setOption("extraKeys", {
      "Ctrl-Space": "autocomplete",
      "Ctrl-Enter": function (cm) {
        const enteredValue = cm.getValue();
        const currentSyntax = $("#editor-syntax").val();
        if (_.validateValueEntered(enteredValue, currentSyntax)) {
          _.saveValue({
            value: _.tansformValue(enteredValue),
            is_expression: true,
            value_ref: null,
          });
          _.hideContentEdition();
        } else {
          utils.toast.showError(
            "Please check the value.",
            "Invalid value entered"
          );
        }
      },
      Esc: function (cm) {
        _.hideContentEdition();
      },
    });

    function getHints(cm, option) {
      return new Promise(function (accept) {
        setTimeout(function () {
          var cursor = cm.getCursor(),
            line = cm.getLine(cursor.line);
          var start = cursor.ch,
            end = cursor.ch;
          while (start && /(\$|\w)/.test(line.charAt(start - 1))) --start;
          while (end < line.length && /(\$)\w/.test(line.charAt(end))) ++end;
          var word = line.slice(start, end).toLowerCase();
          if (word === "" || word.startsWith("$")) return accept(null);
          const vars = workflow_variables.var.variables
            .filter((v) => v.key.startsWith(word))
            .map((v) => {
              let suffix = "";
              if (v.data_type === "array") suffix = `|safe`;

              return `{{${v.context}${utils.replace_context_key(
                v.key
              )}${suffix}}}`;
            });

          const inputs = workflow_inputs.var.inputs
            .filter((v) => v.key.startsWith(word))
            .map((v) => {
              let suffix = "";
              if (v.data_type === "array") suffix = `|safe`;

              return `{{inputs${utils.replace_context_key(v.key)}${suffix}}}`;
            });
          const local = [];
          const incoming = [];

          // TODO: Get values from output
          return accept({
            list: vars.concat(inputs),
            from: CodeMirror.Pos(cursor.line, start),
            to: CodeMirror.Pos(cursor.line, end),
          });
        }, 100);
      });
    }

    _.editor.setOption("hintOptions", {
      hint: getHints,
    });
  }

  saveValue(value) {
    const { input, component, parentInput, popover, isEdition, initials } =
      this;
    const { onSave: overrideSaveValue } = initials;
    if (!isEdition) return;
    if (overrideSaveValue) {
      return overrideSaveValue(value, this);
    }
    if (parentInput && parentInput.input.json_value) {
      const { input: parentInputObj } = parentInput;

      if (parentInputObj.json_value.multi) {
        const parentValue = parentInputObj.value;
        if (parentValue && Array.isArray(parentValue)) {
          for (let i = 0; i < parentValue.length; i++) {
            for (const key in parentValue[i]) {
              if (parentValue[i][key].id === input.id) {
                this.input.value = value;
                parentValue[i][key].value = value;
                parentValue[i][key].is_expression = value.is_expression;
                parentValue[i][key].value_ref = value.value_ref;
                break;
              }
            }
          }
          return parentInput.saveValue(parentValue).then((response) => {
            const selector = this;
            selector.hideContentEdition();
            selector.updateHtml();
            if (popover) popover.hide();
            return response;
          });
        }
      }
    }

    const body = {
      component_id: component.id,
      plugin_id: component.plugin_id,
      plugin_version: component.plugin_version,
      id: input.id,
      key: input.key,
      value: value,
    };
    if (initials.onSave) {
      return initials.onSave(body, this);
    }
    return workflow_components.api
      .updateComponentInputValue(body)
      .then((data) => {
        const selector = this;
        const { key, value, json_value } = data;
        selector.input = data;
        workflow_components.updateInputValue(
          selector.component,
          key,
          value,
          json_value
        );
        selector.hideContentEdition();
        selector.updateHtml();
        if (popover) popover.hide();
        return data;
      })
      .catch((error) => {
        console.error(error);
      });
  }

  updateValue(value, json_value) {
    const _ = this;
    _.input.value = value;
    _.input.json_value = json_value;
    _.updateHtml();
  }

  updateHtml() {
    const _ = this;
    const { markup } = utils;
    const { input, initials } = _;
    const { value, json_value } = input;
    const { type, options, value_rules, multi } = json_value ?? {};
    const { ajax } = value_rules || {};

    if (multi) {
      return;
    }

    const isInvalid = input.required && (value === "" || value === null);
    const invalidClassName = "is-invalid";
    if (isInvalid) {
      _.$content.addClass(invalidClassName);
    } else {
      _.$content.removeClass(invalidClassName);
    }

    if ((value_rules && value_rules.variable_only) || options) {
      if (!value.value) _.$content.addClass(invalidClassName);

      _.$resetButton.hide();
      _.$editButton.hide();
      return;
    }

    _.$editButton.show();
    if (value.value === null || value.value === undefined) {
      if (value.value_ref && initials.valueOnly) {
        _.$resetButton.show();
      } else {
        _.$resetButton.hide();
      }
    } else {
      _.$resetButton.show();
    }

    if (
      ["string", "boolean", "number"].includes(type) &&
      !value.value_ref &&
      !value.is_expression &&
      !value.is_condition
    ) {
      _.$content.empty();
      const element = _.getInputElement(type, value);
      _.$content.append(element);
      if (type === "boolean") {
        _.$content.addClass("boolean-value");
      }
      $(element).on("change", _, function (event) {
        const selectedValue =
          event.target.type === "checkbox"
            ? event.target.checked
            : event.target.value;
        _.saveValue({
          value: selectedValue,
          is_expression: false,
          value_ref: null,
        });
      });
      $(element).on("keyup", _, function (event) {
        const key = event.key;
        if (key === "Enter") {
        } else if (key === "Escape") {
          _.updateHtml();
          _.popover?.hide();
        }
      });
      return;
    }
    if (value && value.value_ref) {
      _.$content.empty();
      const { context: ref_context, key: ref_key } = value.value_ref;
      _.$content.html(markup("code", `${ref_key}`));
    } else if (ajax) {
      if (!value?.value) {
        _.render(value.value);
      } else {
        _.$content.addClass("value-selector");
        _.$content.html(
          (value.is_expression || value.is_condition)
            ? markup(
                "div",
                [{ tag: "i", class: "bi bi-braces" }, " Expression"],
                { class: "text-center" }
              )
            : ` ${value.value?.name}` || ""
        );
      }
    } else {
      _.$content.empty();
      const text = value.is_expression ? " Expression" : value.is_condition ? " Condition value" : "";
      const iconClass = value.is_expression ? "bi bi-braces" : value.is_condition ? "bi bi-patch-check" : "";
      _.$content.html(
        (value.is_expression || value.is_condition)
          ? markup(
              "div",
              [{ tag: "i", class: iconClass }, text],
              { class: "text-center" }
            )
          : value.value || ""
      );
    }
  }

  getInputElement(type, value) {
    const _ = this;
    const { markup } = utils;
    const isDisabled = !_.isEdition;
    if (type === "boolean") {
      return markup("div", [
        markup("input", "", {
          type: "checkbox",
          class: "btn-check",
          id: `${_.component.id}-${_.input.key}`,
          autocomplete: "off",
          checked: value?.value || false,
          disabled: isDisabled,
        }),
        markup("label", value?.value ? "True" : "False", {
          class: "btn btn-outline-primary btn-sm",
          for: `${_.component.id}-${_.input.key}`,
        }),
        markup("br"),
      ]);
    }
    if (type === "string") {
      return markup("input", "", {
        type: "text",
        class: "form-control",
        value: value?.value || "",
        disabled: isDisabled,
      });
    }
    if (type === "number") {
      return markup("input", "", {
        type: "number",
        class: "form-control",
        value: value?.value || "",
        disabled: isDisabled,
      });
    }
    return markup("input", "", {
      type: "text",
      class: "form-control",
      value: value?.value || "",
      disabled: isDisabled,
    });
  }
  getSelector() {
    return this;
  }

  validateValueEntered(enteredValue, currentSyntax = null) {
    let isValid = true;
    const { input } = this;
    const { data_type } = input;
    if (
      ["object", "array"].includes(data_type) &&
      currentSyntax == BWF_SYNTAX.javascript
    ) {
      try {
        JSON.parse(enteredValue);
      } catch (error) {
        isValid = false;
      }
      if (data_type === "array") {
        try {
          const parsedValue = JSON.parse(enteredValue);
          if (!Array.isArray(parsedValue)) {
            isValid = false;
          }
        } catch (error) {
          isValid = false;
        }
      }
    } else if (data_type === "boolean") {
      isValid = selector_condition_utils.validateTmpValue(this);
    }

    return isValid;
  }
  tansformValue(value) {
    const _ = this;
    const { input } = _;
    const { data_type } = input;
    if (data_type === "object" || data_type === "array") {
      try {
        return JSON.stringify(JSON.parse(value));
      } catch (error) {
        return null;
      }
    }
    return value;
  }

  renderConditionRow(container, conditionValue = {}) {
    const _ = this;
    const { markup } = utils;
    const { input, component, isEdition } = this;
    const rowId = `cond__${input.key}_${utils.generateRandomId()}`;
    const includeOperand = (_.tmpValue || []).length > 0;
    const leftElement = markup("div", "", {
      class: "left-element",
      "data-row-id": rowId,
    });
    const rightElement = markup("div", "", {
      class: "right-element",
      "data-row-id": rowId,
    });
    const conditionElement = markup(
      "select",
      [
        { tag: "option", content: "Equal to", value: "equals" },
        { tag: "option", content: "Not equal to", value: "not_equals" },
        { tag: "option", content: "Greater than", value: "greater_than" },
        { tag: "option", content: "Less than", value: "less_than" },
        { tag: "option", content: "Greater than or equal to", value: "gte" },
        { tag: "option", content: "Less than or equal to", value: "lte" },
        { tag: "option", content: "Type of", value: "type_of" },
        { tag: "option", content: "Contains", value: "contains" },
        { tag: "option", content: "Does not contain", value: "not_contains" },
        { tag: "option", content: "Starts with", value: "starts_with" },
        { tag: "option", content: "Ends with", value: "ends_with" },
        { tag: "option", content: "Is empty", value: "is_empty" },
        { tag: "option", content: "Is not empty", value: "is_not_empty" },
        { tag: "option", content: "Is none", value: "is_none" },
        { tag: "option", content: "Is not none", value: "is_not_none" },
      ],
      {
        class: "condition-select form-select",
        "data-row-id": rowId,
      }
    );

    const operandElement = markup(
      "select",
      [
        { tag: "option", content: "AND", value: "and", selected: true },
        { tag: "option", content: "OR", value: "or" },
      ],
      { class: "operand-select form-select", "data-row-id": rowId }
    );

    const removeButton = markup(
      "button",
      { tag: "i", class: "bi bi-trash" },
      {
        class: "btn btn-sm btn-outline-danger remove-condition",
        "data-row-id": rowId,
      }
    );
    const row = markup(
      "div",
      [
        markup("div", leftElement, { class: "col-3" }),
        markup("div", conditionElement, { class: "col-3" }),
        markup("div", rightElement, { class: "col-3" }),
      ],
      {
        class: "condition-row row mb-2",
        id: rowId,
        style: "--bs-gutter-x: 10px;",
      }
    );

    $(row).prepend(
      markup("div", includeOperand ? operandElement : "", { class: "col-2" })
    );
    if (_.isEdition)
      $(row).append(markup("div", removeButton, { class: "col-1" }));
    container.append(row);
    const items = [
      {
        id: "left_value",
        selector: ".left-element",
        name: "Left Value",
        key: "left_value",
        data_type: "string",
        value: conditionValue.left_value || "",
      },
      {
        id: "right_value",
        selector: ".right-element",
        name: "Right Value",
        key: "right_value",
        data_type: "string",
        value: conditionValue.right_value || "",
      },
    ];
    items.forEach((item) => {
      $(row)
        .find(item.selector)
        .valueSelector({
          valueOnly: true,
          parent: _,
          input: {
            name: item.name,
            key: item.key,
            data_type: "string",
            value: item.value,
            json_value: {
              type: "string",
              options: null,
              value_rules: null,
            },
            required: true,
          },
          component: component,
          isEdition: isEdition,
          onSave: function (value, selector) {
            const rowId = $(selector.$element).data("row-id");
            selector.input.value = value;
            selector_condition_utils.updateTmpValue(
              selector.parentInput,
              rowId
            );
            selector.updateHtml();
            if (selector.popover) selector.popover.hide();
            return value;
          },
        });
    });

    // update Initial Tmp Value
    selector_condition_utils.updateTmpValue(_, rowId);
    if (conditionValue.operand) $(operandElement).val(conditionValue.operand);
    if (conditionValue.condition) {
      $(conditionElement).val(conditionValue.condition);
      selector_condition_utils.onConditionChange(
        conditionValue.condition,
        rowId
      );
    }

    $(`#${rowId}`)
      .find(".condition-select")
      .on("change", _, function (event) {
        const selector = event.data;
        const value = $(this).val();
        const rowId = $(this).data("row-id");
        selector_condition_utils.onConditionChange(value, rowId);
        selector_condition_utils.updateTmpValue(selector, rowId);
      });

    $(`#${rowId}`)
      .find(".operand-select")
      .on("change", _, function (event) {
        const selector = event.data;
        const rowId = $(this).data("row-id");
        selector_condition_utils.updateTmpValue(selector, rowId);
      });
    $(removeButton).on("click", _, function (event) {
      const selector = event.data;
      const rowId = $(this).data("row-id");
      selector_condition_utils.removeRow(selector, rowId);
    });
  }
}

jQuery.fn.valueSelector = function (...args) {
  const _ = this;
  const opt = args[0];
  const moreArgs = Array.prototype.slice.call(args, 1);
  const l = _.length;
  let i;
  let ret;

  for (i = 0; i < l; i++) {
    if (typeof opt === "object" || typeof opt === "undefined") {
      _[i].formb = new ValueSelector(_[i], opt, jQuery);
    } else {
      ret = _[i].formb[opt].apply(_[i].formb, moreArgs, jQuery);
    }
    if (typeof ret !== "undefined") return ret;
  }
  return _;
};

selector_condition_utils = {
  validateTmpValue: function (selector) {
    selector.tmpValue = selector.tmpValue || [];
    let isValid = true;
    for (let i = 0; i < selector.tmpValue.length; i++) {
      const { id, left_value, right_value, operand } = selector.tmpValue[i];
      if (!left_value || left_value === "") isValid = false;
    }
    return isValid;
  },
  updateTmpValue: function (selector, rowId) {
    const value = selector_condition_utils.getConditionRowValue(rowId);
    selector.tmpValue = selector.tmpValue || [];
    const index = selector.tmpValue.findIndex((v) => v.id === rowId);
    if (index !== -1) {
      selector.tmpValue[index] = value;
    } else {
      selector.tmpValue.push(value);
    }
  },
  onConditionChange: function (value, rowId) {
    if (
      ["is_empty", "is_not_empty", "is_none", "is_not_none"].includes(value)
    ) {
      $(`#${rowId}`).find(".right-element").hide();
    } else {
      $(`#${rowId}`).find(".right-element").show();
    }
  },
  removeRow: function (selector, rowId) {
    const row = $(`#${rowId}`);
    if (!row.length) return;
    row.remove();
    const index = selector.tmpValue.findIndex((v) => v.id === rowId);
    if (index !== -1) {
      selector.tmpValue.splice(index, 1);
    }
  },
  getConditionRowValue: function (rowId) {
    const row = $(`#${rowId}`);
    if (!row.length) return null;
    const leftValueSelector = row
      .find(".left-element")
      .valueSelector("getSelector");
    const rightValueSelector = row
      .find(".right-element")
      .valueSelector("getSelector");
    const condition = row.find(".condition-select").val();
    const operand = row.find(".operand-select").val();

    let left_value = leftValueSelector.input?.value;
    let right_value = rightValueSelector.input?.value;
    if (
      ["is_empty", "is_not_empty", "is_none", "is_not_none"].includes(condition)
    ) {
      right_value = null;
    }

    return {
      id: rowId,
      left_value,
      right_value,
      condition: condition,
      operand: operand || "and",
    };
  },
};
