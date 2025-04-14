/* eslint-disable prefer-spread */
/* eslint-disable no-plusplus */
class ContextVariableMenu {
  constructor(element, settings, $) {
    const _ = this;
    const { markup } = utils;

    _.defaults = {
      name: "DBCA-BWF-CONTEXT-VARIABLE-MENU",
      theme: "default",
    };

    const {
      input,
      component,
      onSelectValue,
      onCancel,
      showInPopover,
      isEdition,
    } = settings;

    if (!input || !component) {
      return;
    }
    const { value, value_ref, json_value, data_type } = input;
    const { type, options, value_rules } = json_value || {};

    _.component = component;
    _.input = input;
    _.isEdition = isEdition;

    _.elementId = `context-menu-${component.id}-${input.key}${
      showInPopover ? "-popover" : ""
    }`;

    _.initials = {
      present: true,
      value: value,
      value_ref: value_ref,
      type: type,
      options: options,
      value_rules: value_rules,
      showInPopover: showInPopover === true,
      onSelectValue: onSelectValue ?? function (value) {},
      onCancel: onCancel ?? function () {},
    };
    _.popover = null;

    $.extend(_, _.initials);
    _.$element = $(element);

    // Acts like a button
    if (_.initials.showInPopover) {
      _.$element.empty();
      _.renderInPopover();
    } else {
      _.$element.empty();
      _.setupMenu(_.$element);
    }
  }

  renderInPopover() {
    const _ = this;
    const { markup } = utils;
    const popoverContent = $(
      markup(
        "div",
        [
          {
            tag: "div",
            class: "context-menu",
            content: "",
          },
        ],
        { "data-name": null }
      )
    );

    // popoverContent.attr("id", `popover-content-${input.key}`);
    popoverContent.find(".context-menu").attr("id", _.elementId);

    popoverContent.find(".btn-close").on("click", _, function (event) {
      const selector = event.data;
      selector.popover.hide();
    });

    _.$element.empty();
    _.$element.append(
      markup(
        "span",
        [{ tag: "i", class: "bi bi-braces-asterisk me-2" }, "vars/inputs"],
        { class: "btn btn-outline-secondary mb-2 btn-sm menu-popover" }
      )
    );
    const popoverButton = _.$element.find(".menu-popover");

    const popoverOptions = {
      html: true,
      title: "",
      content: popoverContent,
      placement: "bottom",
      container: "#component-side-panel > section",
      customClass: "popover-value-selector",
    };
    _.popover = new bootstrap.Popover(popoverButton, popoverOptions);

    popoverButton.on("shown.bs.popover", _, function (event) {
      const _ = event.data;
      _.setupMenu($(`#${_.elementId}`));
    });

    popoverButton.on("show.bs.popover", _, function (event) {
      const selector = event.data;
      selector.onPopoverOpen();
    });
  }

  onPopoverOpen() {
    const _ = this;
  }

  setupMenu(container) {
    const _ = this;
    const { markup } = utils;

    const menuElements = markup("ul", [
      // inputs,
      {
        tag: "li",
        content: [
          markup("div", "Inputs"),
          markup(
            "ul",
            workflow_inputs.var.inputs
              .map((el) => ({
                tag: "li",
                content: el.label,
                class: "value",
                "data-context": "inputs",
                "data-value": el.id,
                "data-key": el.key,
              }))
              .concat([
                {
                  tag: "li",
                  content: {
                    tag: "div",
                    content: [
                      { tag: "i", class: "bi bi-plus mr-2" },
                      "Add input",
                    ],
                  },
                  class: "add-input",
                },
              ]),
            { class: "values-list" }
          ),
        ],
      },
      // variables
      {
        tag: "li",
        content: [
          markup("div", "Variables"),
          markup(
            "ul",
            workflow_variables.var.variables
              .map((el) => ({
                tag: "li",
                content: el.name,
                class: "value",
                "data-context": "variables",
                "data-id": el.id,
                "data-key": el.key,
              }))
              .concat([
                {
                  tag: "li",
                  content: {
                    tag: "div",
                    content: [
                      { tag: "i", class: "bi bi-plus mr-2" },
                      "Create variable",
                    ],
                  },

                  class: "add-variable",
                },
              ]),
            { class: "values-list" }
          ),
        ],
      },
    ]);
    if (
      _.component.config?.incoming &&
      _.component.config.incoming.length > 0
    ) {
      $(menuElements).append(
        markup("li", [
          markup("div", "Incoming values"),
          markup(
            "ul",
            _.getIncomingMenu(_.component.config.incoming, "incoming")
          ),
        ])
      );
    }

    container.empty();
    container.append(menuElements.children);
    if (container.attr("role")) {
      container.menu("destroy");
      container.show();
    }
    container.menu();
    container.show();
    container.find("li.value").on("click", _, function (event) {
      event.stopPropagation();
      const selector = event.data;
      const $this = $(this);
      const id = $this.data("id");
      const key = $this.data("key");
      const context = $this.data("context");
      if (!key || !context) {
        return;
      }
      let parentContext = $this.data("parent-context");
      const contextList = [context];
      while (parentContext) {
        if (!parentContext) break;
        const parent = $(`#${parentContext}`);
        if (!parent) break;
        contextList.push(parent.data("context"));
        parentContext = parent.data("parent-context");
      }
      selector?.onSelectValue({
        id,
        key,
        context: contextList.reverse().join("."),
      });
      selector.popover?.hide();
    });
    container.find(".values-list .add-input").on("click", _, function (event) {
      const _ = event.data;
      if (!_.isEdition) return;
      $("#inputs-modal").modal("show");
      _.initials.onCancel();
    });
    container
      .find(".values-list .add-variable")
      .on("click", _, function (event) {
        const _ = event.data;
        if (!_.isEdition) return;
        $("#variables-modal").modal("show");
        _.initials.onCancel();
      });
  }

  getIncomingMenu(incoming, context, parentContextId) {
    const _ = this;
    const items = [];
    for (let i = 0; i < incoming.length; i++) {
      const el = incoming[i];
      const parentId = `ctx-incoming-${el.key}`;
      const subItems = [];
      if (el.data_type === "object" && el.data) {
        const dataArray = Object.keys(el.data).map((key) => el.data[key]);
        subItems.push(_.getIncomingMenu(dataArray, `${el.key}`, parentId));
      }
      items.push({
        tag: "li",
        content: [
          { tag: "div", content: el.label },
          subItems.length > 0 ? { tag: "ul", content: subItems } : "",
        ],
        class: "value",
        id: parentId,
        "data-context": context,
        "data-parent-context": parentContextId ?? "",
        "data-value": el.id,
        "data-key": el.key,
      });
    }

    return items;
  }
}

jQuery.fn.contextMenu = function (...args) {
  const _ = this;
  const opt = args[0];
  const moreArgs = Array.prototype.slice.call(args, 1);
  const l = _.length;
  let i;
  let ret;

  for (i = 0; i < l; i++) {
    if (typeof opt === "object" || typeof opt === "undefined") {
      _[i].formb = new ContextVariableMenu(_[i], opt, jQuery);
    } else {
      ret = _[i].formb[opt].apply(_[i].formb, moreArgs, jQuery);
    }
    if (typeof ret !== "undefined") return ret;
  }
  return _;
};
