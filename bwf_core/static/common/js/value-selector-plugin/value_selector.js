/* eslint-disable prefer-spread */
/* eslint-disable no-plusplus */
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
    const { value_ref, value, is_expression } = input.value ?? {};

    _.component = component;
    _.input = input;
    _.parentInput = parent;
    _.isEdition = isEdition;
    _.useOutputFields = useOutputFields || false;
    _.isRouting = isRouting || false;
    _.portal = portal;
    _.parentComponentElement = $(`#routing-form, #node_panel_${component.id}`);
    _.select2 = null;

    _.initials = {
      present: true,
      value: value,
      value_ref: value_ref,
      type: type,
      options: options,
      value_rules: value_rules,
      is_expression: !!is_expression,
      showEditor: !!is_expression,
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

    _.updateHtml();
    _.render(value, value_ref);
  }

  render(value, value_ref = {}) {
    const _ = this;
    const { markup } = utils;
    const $vars = workflow_variables;
    const { input, component, isEdition } = _;

    const isDisabled = !isEdition;

    const { type, options, value_rules, multi, structure } =
      _.input?.json_value ?? {};

    const { ajax } = value_rules || {};

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
        const context =
          $(event.target).find("option:selected").data("context") ??
          "variables";
        const name =
          $(event.target).find("option:selected").data("name") ?? "undefined";
        const key = $(event.target).find("option:selected").data("key");
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
    const { value } = input;
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
    const { input, component, isEdition } = _;
    const { value, value_ref, is_expression } = input.value ?? {};
    const { type, options, value_rules } = _.input?.json_value ?? {};
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

    _.$resetButton.off('click').on("click", _, function (event) {
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

    const { input, component, isEdition } = _;
    const { value, value_ref } = input.value ?? {};
    const { type, options, value_rules } = _.input?.json_value ?? {};

    const { ajax } = value_rules || {};
    if (!ajax) {
      return;
    }

    const { url, structure } = ajax;

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
        dropdownParent: $("#component-side-panel > section"),
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
    const { value, value_ref, is_expression } = input.value ?? {};
    _.parentComponentElement.hide();
    if (!_.isRouting) $('#routing-component').hide();

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
      selector.hideContentEdition();

      selector.saveValue({
        value: selectedValue,
        is_expression: true,
        value_ref: null,
      });
    });

    editorBlockContent.find(".btn-close").on("click", _, function (event) {
      const selector = event.data;
      const { value } = selector.input.value ?? {};
      selector.editor?.setValue(typeof (value?.value ?? {}) === "string" ? value : JSON.stringify(value?.value ?? ''));
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
      _.setUpEditor(_.portal.find(".editor")[0]);
    }
    const { type, options, value_rules } = _.input?.json_value ?? {};
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
        _.editor.setValue(typeof value === "string" ? value : JSON.stringify(value));
      }
      if (!value && value_ref) {
        _.editor.setValue(`${value_ref.context}['${value_ref.key}']`);
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
        if (_.initials.showEditor && _.editor) {
          const doc = _.editor.getDoc();
          const cursor = doc.getCursor();
          const contextValue = convert_context_to_python_dict(
            selectedValue?.context
          );
          doc.replaceRange(`${contextValue}['${selectedValue?.key}']`, cursor);
        } else {
          _.saveValue({
            value: null,
            is_expression: false,
            value_ref: {
              context: selectedValue.context,
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
      container: "#component-side-panel > section",
      customClass: "popover-value-selector",
    };

    if (_.isEdition) {
      _.popover = new bootstrap.Popover(_.$content, popoverOptions);
    }

    _.$content.on("shown.bs.popover", _, function (event) {
      const _ = event.data;
      const { input, component } = _;
      const { value, is_expression } = input.value ?? {};
      const { convert_context_to_python_dict } = utils;

      $(`#context-menu-${component.id}-${input.key}`).contextMenu({
        input,
        component,
        isEdition,
        useOutputFields,
        showInPopover: !!is_expression || _.initials.showEditor,
        onSelectValue: (selectedValue) => {
          if (!isEdition) return;
          if (_.initials.showEditor && _.editor) {
            const doc = _.editor.getDoc();
            const cursor = doc.getCursor();
            const contextValue = convert_context_to_python_dict(
              selectedValue?.context
            );
            doc.replaceRange(
              `${contextValue}['${selectedValue?.key}']`,
              cursor
            );
          } else {
            _.saveValue({
              value: null,
              is_expression: false,
              value_ref: {
                context: selectedValue.context,
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

  setUpEditor(element) {
    const _ = this;
    const { input } = _;
    const { value, value_ref } = input.value ?? {};

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
      _.editor.setValue(typeof value === "string" ? value : JSON.stringify(value));
    }
    if (!value && value_ref) {
      _.editor.setValue(`${value_ref.context}['${value_ref.key}']`);
    }

    _.editor.setOption("extraKeys", {
      "Ctrl-Space": "autocomplete",
      "Ctrl-Enter": function (cm) {
        _.saveValue({
          value: cm.getValue(),
          is_expression: true,
          value_ref: null,
        });
        _.hideContentEdition();
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
            .map((v) => `${v.context}['${v.key}']`);

          const inputs = workflow_inputs.var.inputs
            .filter((v) => v.key.startsWith(word))
            .map((v) => `inputs['${v.key}']`);
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
    const {
      input,
      component,
      parentInput,
      $element,
      popover,
      isEdition,
      initials,
    } = this;
    const { onSave: overrideSaveValue } = initials;
    if (!isEdition) return;
    if (overrideSaveValue) {
      return overrideSaveValue(value);
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
    const { input, component } = _;
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
      _.$resetButton.hide();
    } else {
      _.$resetButton.show();
    }

    if (
      ["string", "boolean", "number"].includes(type) &&
      !value.value_ref &&
      !value.is_expression
    ) {
      _.$content.empty();
      const element = _.getInputElement(type, value);
      _.$content.append(element);
      if (type === "boolean") {
        _.$content.addClass("boolean-value");
      }
      $(element).on("change", _, function (event) {
        const selector = event.data;
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
        const selector = event.data;
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
          value.is_expression
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
      _.$content.html(
        value.is_expression
          ? markup(
              "div",
              [{ tag: "i", class: "bi bi-braces" }, " Expression"],
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
    const options = {};
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
