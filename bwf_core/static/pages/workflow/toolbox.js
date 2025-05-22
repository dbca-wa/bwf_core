var workflow_toolbox = {
  conditionSelector: null,
  var: {
    condition: null,
    action: null,
    label: null,
  },
  init: function () {
    // Initialize the toolbox
    this.bindEvents();
  },

  bindEvents: function () {
    // Bind events to toolbox items
  },
  cancelNewLine: function () {
    const wf = workflow_components;
    wf.mode = "default";
    wf.newLine.isNewLine = false;
    wf.newLine.originElement?.removeClass("selected");
    wf.newLine.destinationElement?.removeClass("selected");
    if (wf.newLine.isNewLine) {
      wf.newLine.line?.remove();
    } else {
      wf.newLine.line?.setOptions({
        color: component_utils.constants.routeLineColor,
        dash: false,
        size: 1,
      });
    }
    Object.keys(wf.newLine).forEach((key) => {
      wf.newLine[key] = null;
    });
    $("body").off("keydown", component_utils.handleEscNewLine);
  },
  renderRoutingSidePanel: function (originComponent, destinationComponent) {
    const wf = workflow_components;
    const _ = workflow_toolbox;
    wf.sidePanel.open();
    const { isNewLine } = wf.newLine;

    const body = wf.sidePanel.find(".offcanvas-body");
    const header = wf.sidePanel.find(".offcanvas-header .offcanvas-title");
    header.html(isNewLine ? "New route" : "Routing edition");
    body.empty();
    workflow_toolbox.setupRoutingEditionContainer(
      body,
      originComponent,
      destinationComponent,
      (data) => {
        // on save
        const form = $("#routing-form");
        form.prop("disabled", false);
        wf.sidePanel.close();

        const _component = component_utils.findSingleComponentInTree(
          originComponent.id
        );
        _component.routing = data.routing || [];
        workflow_components.renderRoutingLine(
          _component,
          destinationComponent.id
        );
      },
      (data) => {}, // on delete
      () => {
        // cancel
        const wf = workflow_components;
        wf.sidePanel.close();
      },
      (error) => {
        const form = $("#routing-form");
        form.prop("disabled", false);
        console.error(error);
        wf.sidePanel.close();
      }
    );
  },

  setupRoutingEditionContainer: function (
    body,
    originComponent,
    destinationComponent,
    onSave = (data) => {},
    onDelete = () => {},
    onCancel = () => {},
    onError = (error) => {}
  ) {
    const { markup } = utils;
    const wf = workflow_components;
    const _ = workflow_toolbox;
    const { isNewLine } = wf.newLine;

    const existingRoute = originComponent.routing.find(
      (r) => r.route === destinationComponent.id
    );

    const label = existingRoute?.label || "";
    const action = existingRoute?.action || "";
    const condition = existingRoute?.condition || {};
    _.var.condition = condition;

    const template = document.querySelector("#component-routing-template");

    const clone = template.content.cloneNode(true);
    body.append(clone);
    body
      .find(".route-names")
      .append(
        markup("span", `${originComponent.name} → ${destinationComponent.name}`)
      );
    body.append(
      markup(
        "div",
        [
          {
            tag: "textarea",
            class: "editor",
            name: "editor",
            style: "display: none",
          },
        ],
        { class: "panel-value-edition" }
      )
    );

    if (!isNewLine) {
      body.find(".delete-btn").show();
      body.find(".delete-btn").on("click", function (event) {
        event.preventDefault();
        $(this).prop("disabled", true);
        const data = {
          id: originComponent.id,
          plugin_id: originComponent.plugin_id,
          route: destinationComponent.id,
          is_remove: true,
        };

        wf.api.updateRouting(
          data,
          function (response) {
            $(this).prop("disabled", true);
            wf.newLine.line?.remove();
            originComponent.routing = originComponent.routing.filter(
              (r) => r.route !== destinationComponent.id
            );
            const oIndex = originComponent.diagram.lines.findIndex(
              (l) => l.destination === destinationComponent.id
            );
            if (oIndex !== -1) {
              const line = originComponent.diagram.lines[oIndex];
              try {
                line.line.remove();
              } catch (error) {}
              originComponent.diagram.lines.splice(oIndex, 1);
            }
            const dIndex = destinationComponent.diagram.lines.findIndex(
              (l) => l.source === originComponent.id
            );
            if (dIndex !== -1) {
              destinationComponent.diagram.lines.splice(dIndex, 1);
            }
            onDelete(response);
          },
          function (error) {
            form.prop("disabled", false);
            console.error(error);
            onError(error);
          }
        );
      });
    } else {
      body.find(".delete-btn").hide();
    }
    
    if(!wf.isEdition) {
      $(body).find(`.routing-buttons`).remove();
    }

    $(`#routing-form`).find(".routing-label").val(label);
    const conditionElement = $(`#routing-form`).find(".routing-condition");
    conditionElement.valueSelector({
      input: {
        key: "condition",
        value: condition,
        data_type: "boolean",
      },
      component: originComponent,
      isEdition: wf.isEdition,
      useOutputFields: true,
      isRouting: true,
      portal: $(body).find(".panel-value-edition"),
      onSave: function (data) {
        _.var.condition = data;
        const selector = _.conditionSelector;
        selector.input.value = data;
        selector.hideContentEdition();
        selector.updateHtml();
        if (selector?.popover) selector.popover.hide();
      },
    });
    _.conditionSelector = conditionElement.valueSelector("getSelector");

    $(wf.sidePanel).on("click", function (event) {
      if ($(event.target).hasClass("slide-out-panel"))
        component_utils.closePopovers();
    });
    $("#routing-form .cancel-btn").on("click", this, function (event) {
      event.preventDefault();
      onCancel();
    });
    $("#routing-form").on("submit", this, function (event) {
      const wf = workflow_components;
      event.preventDefault();
      const form = $(this);
      if (form.prop("disabled")) return;
      form.prop("disabled", true);
      const label = form.find(".routing-label").val();
      const action = form.find(".routing-action").val();

      const data = {
        id: originComponent.id,
        plugin_id: originComponent.plugin_id,
        route: destinationComponent.id,
        condition: _.var.condition,
        label: label,
        action: action,
      };

      wf.api.updateRouting(
        data,
        function (response) {
          form.prop("disabled", false);
          originComponent.routing = response.routing;
          const _component = component_utils.findSingleComponentInTree(
            originComponent.id
          );
          _component.routing = data.routing || [];
          onSave(response);
        },
        function (error) {
          form.prop("disabled", false);
          console.error(error);
          onError(error);
        }
      );
    });
  },
  renderRoutingCondition: function (element, route) {
    if (!element || !route) return;
    const { markup } = utils;
    const { value, is_expression, value_ref } = route.condition || {};

    if (value_ref) {
      element.empty();
      const { context: ref_context, key: ref_key } = value_ref;
      element.html(markup("code", `${ref_context} - ${ref_key}`));
    } else {
      element.empty();
      element.html(
        is_expression
          ? markup(
              "code",
              [{ tag: "i", class: "bi bi-braces" }, " Expression"],
              { class: "text-center" }
            )
          : value || ""
      );
    }
  },
};
