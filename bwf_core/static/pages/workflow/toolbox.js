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
    $("#toolbox .new-line button").on("click", function (event) {
      const wf = workflow_components;
      if (wf.mode === "new-line") {
        workflow_toolbox.cancelNewLine();
        $(this).removeClass("btn-primary");
        $(this).addClass("btn-outline-primary");

        return;
      }
      wf.mode = "new-line";
      $(this).addClass("btn-primary");
      $(this).remove("btn-outline-primary");
    });
  },
  cancelNewLine: function () {
    const wf = workflow_components;
    wf.mode = "default";
    wf.newLine.originElement?.removeClass("selected");
    wf.newLine.destinationElement?.removeClass("selected");
    if (wf.newLine.isNewLine) {
      wf.newLine.line?.remove();
    } else {
      console.log("cancelNewLine", wf.newLine);
    }
    Object.keys(wf.newLine).forEach((key) => {
      wf.newLine[key] = null;
    });
    $("#toolbox .new-line button").removeClass("btn-primary");
    $("#toolbox .new-line button").addClass("btn-outline-primary");
  },
  renderRoutingSidePanel: function (originComponent, destinationComponent) {
    const wf = workflow_components;
    const _ = workflow_toolbox;
    wf.sidePanel.open();
    const { isNewLine } = wf.newLine;

    const body = wf.sidePanel.find("section");
    const header = wf.sidePanel.find("header");
    header.html(isNewLine ? "New route" : "Routing edition");
    body.empty();
    workflow_toolbox.setupRoutingEditionContainer(
      body,
      originComponent,
      destinationComponent,
      (data) => {},
      (data) => {},
      () => {
        const wf = workflow_components;
      wf.sidePanel.close();
      },
    );
  },

  setupRoutingEditionContainer: function (
    body,
    originComponent,
    destinationComponent,
    onSave=()=> {},
    onDelete=()=> {},
    onCancel=()=> {}
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
    body.find(".route-names").append(markup("span", `${originComponent.name} → ${destinationComponent.name}`));
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
          wf.sidePanel.close();
          onSave(response);
        },
        function (error) {
          form.prop("disabled", false);
          console.error(error);
        }
      );
    });
  },
};
