var workflow_components = {
  workflow_id: null,
  version_id: null,
  isEdition: true,
  is_diagram: false,
  has_init: false,
  add_component_btn: null,
  containerId: null,
  container: null,
  firstLine: null,
  sidePanel: null,

  selectedComponent: null,
  var: {
    base_url: "/bwf/api/workflow-components/",
    base_plugin_url: "/bwf_components/",
    components: [],
    definitions: [],
    incoming: [],
  },
  mode: "default",
  newLine: {
    originElement: null,
    destinationElement: null,
    originComponent: null,
    destinationComponent: null,
    line: null,
    isNewLine: false,
  },
  pluginDefinitions: [],

  reset: function () {
    const _ = workflow_components;
    window.location.reload();
  },

  init: function (options, containerId) {
    const { workflow_id, version_id, is_edition, is_diagram, sidePanel } =
      options;
    const _ = workflow_components;
    if (!workflow_id || !version_id || !containerId) {
      console.error("workflow_id and containerId are required");
      console.error("workflow_id is required");
      return;
    }
    _.workflow_id = workflow_id;
    _.version_id = version_id;
    _.containerId = containerId;

    _.isEdition = is_edition;
    _.is_diagram = is_diagram;

    _.container = $(`#${containerId}`);
    _.sidePanel = sidePanel;
    // Add + Buttton
    const _params = {
      workflow_id: _.workflow_id,
      version_id: _.version_id,
    };
    const queryParams = utils.make_query_params(_params);
    $.ajax({
      url: _.var.base_url + "?" + queryParams,
      type: "GET",
      success: function (data) {
        _.var.components = data;
        if (data.length > 0) {
          $(".main-add-component").hide();
        } else {
          $(".main-add-component").show();
        }
        _.renderComponents(_.container, _.var.components);
      },
      error: function (error) {
        console.error(error);
      },
    });
    _.has_init = true;
  },
  renderComponents: function (container, components) {
    const _ = workflow_components;
    // entry point
    if (components.length === 0) {
      return;
    }

    const entry_point = components.find(
      (component) => component.conditions.is_entry
    );
    if (!entry_point) {
      throw new Error("Workflow doesn't have an entry point.");
    }
    // Build COmponents graph
    let component = entry_point;
    const nodeIds = {};
    components.forEach((component) => {
      nodeIds[component.id] = component;
    });
    _.renderComponentTree(container, component, nodeIds, components);
    // component_utils.adjustWorkflowContainerHeight();

    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      if (i === 0 && !component.parent_info?.parent_id) {
        _.renderFirstLine(component);
      }
      _.renderRoutingLine(component);
    }
    // $("#toolbox .new-line button").trigger("click")
    // $(`#node_${components[3].id}`).find(".component-out")?.trigger("click");
    // $(`#node_${components[0].id}`).find(".diagram-node")?.trigger("click")
    // setTimeout(() => { 
    //   $($(".value-selector-edit")[3]).trigger("click");
    //  }, 300);
    // $(`#node_${components[2].id}`).find(".diagram-node")?.trigger("click")
    const _container = $("body");

    var scrollTo = $("#components-flow");
    var position =
      scrollTo.offset().top - _container.offset().top + _container.scrollTop();
    _container.scrollTop(position);
  },

  renderComponentTree: function (container, component, nodeIds, components) {
    const _ = workflow_components;
    if (Object.keys(nodeIds).length === 0) {
      return;
    }
    if (!component) {
      console.log("Orphan component");
    }

    if (nodeIds[component.id]) {
      _.appendComponent(component, container);

      if (_.isEdition) _.makeComponentDraggable(component);

      delete nodeIds[component.id];
    }
    if (component.routing) {
      for (let i = 0; i < component.routing.length; i++) {
        const route = component.routing[i];
        const next_component = components.find(
          (component) => component.id === route.route
        );
        if (!next_component) {
          console.error("Route not found", route);
          continue;
        }
        if (!Object.keys(nodeIds).includes(next_component.id)) {
          console.log("Component has already been added");
          continue;
        }
        _.renderComponentTree(container, next_component, nodeIds, components);
      }
    }
  },
  makeComponentDraggable: function (component) {
    if (!component || !component_utils.shouldBeDraggable(component)) {
      return;
    }
    $(`#node_${component.id}.diagram-node-parent`).draggable({
      handle: ".node-handle:first",
      containment: "#components-flow",
      scroll: false,
    });
  },
  renderFirstLine: function (component) {
    const _ = workflow_components;

    _.firstLine = new LeaderLine(
      $(`#flow-start-node`)[0],
      $(`.component-node, .diagram-node`)[0],
      {
        ...component_utils.constants.lineStyle,
      }
    );
    $(`#node_${component.id}`).on(
      "drag",
      { isFirstLine: true, id: component.id },
      _.handleRoutingLineDrag
    );
  },
  renderRoutingLine: function (component, routeID) {
    const _ = workflow_components;
    if (component.routing) {
      const start = $(
        `#node_${component.id} .component-route.component-out:last`
      );
      for (let i = 0; i < component.routing.length; i++) {
        const route = component.routing[i];
        if (routeID && routeID !== route.route) {
          continue;
        }
        const { route: routePath, conditions, label, action } = route;
        const end = $(`#node_${routePath} .diagram-node`);
        if (start.length > 0 && end.length > 0) {
          const destination = component_utils.findNodeInTree(routePath);
          try {
            // destination.diagram?.line_in?.remove();
            if (destination.diagram?.lines) {
              // destination.diagram?.lines_in
            }
          } catch (error) {}

          const line = new LeaderLine(start[0], end[0], {
            ...component_utils.constants.lineStyle,
            middleLabel: label,
            path: component.parent_info?.parent_id ? "fluent" : "grid",
          });

          component.diagram = component.diagram || {};
          component.diagram.lines = component.diagram.lines || [];
          component.diagram.lines.push({
            destination: routePath,
            line: line,
            label: label,
            action: action,
          });
          destination.diagram = destination.diagram || {};
          destination.diagram.lines = destination.diagram.lines || [];
          destination.diagram.lines.push({
            source: component.id,
            line: line,
            label: label,
            action: action,
          });
          $(`#node_${component.id}`).on(
            "drag.line_out",
            { isSource: true, id: component.id },
            _.handleRoutingLineDrag
          );
          $(`#node_${routePath}`).on(
            "drag.line_in",
            { isSource: false, id: routePath },
            _.handleRoutingLineDrag
          );
        }
      }
    }
    if (component.config.branch) {
      component_utils.render.renderOuterBranchLines(component);
    }
  },
  handleNodePositionChange: function (event) {
    const _ = workflow_components;
    const component = event.data;
    const node = $(`#node_${component.id}`);
    const x = node.css("top");
    const y = node.css("left");
    const data = {
      id: component.id,
      plugin_id: component.plugin_id,
      position: {
        x,
        y,
      },
    };
    workflow_components.api.updateComponent(
      data,
      function (response) {
        component_utils.findNodeInTree(component.id);
      },
      function (err) {}
    );
  },
  handleRoutingLineDrag: function (event, ui) {
    const _ = workflow_components;
    const isSource = event.data.isSource;
    const isFirstLine = event.data.isFirstLine;
    const componentId = event.data.id;
    const component = (source_component =
      component_utils.findSingleComponentInTree(componentId));
    const { node_type } = component;
    Object.keys(component?.diagram?.paths || {}).forEach((key) => {
      const path = component.diagram.paths[key];
      try {
        path.position();
      } catch (error) {}
    });
    component?.diagram?.lines?.forEach((route) => {
      try {
        route?.line?.position();
      } catch (error) {
        console.log("should delete this line from " + component.name);
      }
    });
    if (isSource !== undefined && isSource) {
      try {
        // component.diagram.lines.find((line) => line.source === componentId)?.line?.position();
        component.diagram.lines
          .filter((route) => route.source)
          .forEach((route) => {
            route?.line?.position();
          });
      } catch (e) {}
    } else {
      try {
        component.diagram.lines
          .filter((route) => route.destination)
          .forEach((route) => {
            route?.line?.position();
          });
      } catch (e) {}
    }
    if (isFirstLine) {
      _.firstLine.position();
    }
    if (node_type !== "node") {
      const paths = Object.values(component["config"][node_type]);
      for (let path in paths) {
        _.updateLines(paths[path]);
      }
      component_utils.render.positionOuterBranchLines(component);
    }
  },
  appendComponentToDiagram: function (component, container, appendPosition) {
    const template = document.querySelector("#component-diagram-node-template");
    const { markup } = utils;

    const { id, name } = component;
    const { inputs, outputs } = component.config;
    const inputArray = inputs || [];
    const outputArray = outputs || [];
    // Clone the new row and insert it into the table
    const clone = template.content.cloneNode(true);
    const _ = workflow_components;
    const elementId = `node_${id}`;
    component.diagram = { elementId: elementId };
    clone.querySelector(".diagram-node-parent").setAttribute("id", elementId);
    clone.querySelector(".diagram-node").setAttribute("data-component-id", id);

    if (appendPosition && appendPosition.container) {
      const { position, container: appendContainer } = appendPosition;
      if (position === "before") {
        appendContainer.prepend(clone);
      } else if (position === "after") {
        appendContainer.after(clone);
      } else if (position === "append") {
        appendContainer.after(clone);
      }
    } else {
      container.append(clone);
    }

    const position = { top: component.ui?.x, left: component.ui?.y };
    $(`#${elementId}`).css("top", position.top);
    $(`#${elementId}`).css("left", position.left);

    $(`#${elementId}`).hover(
      function () {
        $(this).find(".diagram-node-buttons").show();
      },
      function () {
        $(this).find(".diagram-node-buttons").hide();
      }
    );
    $(`#${elementId}`)
      .find(".component-icon")
      .html(
        markup("i", "", {
          class: component.ui?.icon_class ?? "bi bi-gear",
        })
      );
    $(`#${elementId}`).find(".component-label span").html(name);
    if (!_.isEdition) {
      $(`#${elementId}`).find(".delete-component").remove();
      $(`#${elementId}`).find(".add-next-component").remove();
      $(`#${elementId}`).find(".add-on-fail").remove();
    }
    _.addMenuDiagramNodeFunctionality(elementId, component);

    if (component.config.branch) {
      component_utils.render.renderBranch(elementId, component);
    }

    if (component.config.loop) {
      component_loop.render.renderLoop(elementId, component);
    }
  },

  appendComponent: function (component, container, appendPosition) {
    const _ = workflow_components;
    _.container;
    if (_.is_diagram) {
      _.appendComponentToDiagram(component, container, appendPosition);
      _.updateLines();
      /* // check node position inside container
      const node = $(`#node_${component.id}`);
      debugger
      _.container.position()
      const {top} = node.position()
      const {top: containerTop} = _.container.position()
      
      const lowerBound = containerTop + _.container.height();
      const nodeLowerBound = top + node.height();

      if (nodeLowerBound > lowerBound) {
        
      } */

      return;
    }
  },
  addMenuDiagramNodeFunctionality: function (elementId, component) {
    // get parent info if any
    const { parent_id, node_path } = component?.parent_info || {};
    const _ = workflow_components;
    if (parent_id) {
      $(`#${elementId}`)
        .find(".component-route.component-out")
        .attr("data-parent-id", parent_id)
        .attr("data-path", node_path);
    }
    $(`#${elementId}`)
      .find(".diagram-node")
      ?.on("click", component, function (event) {
        if ($(event.target.parentNode).hasClass("dnb")) {
          // if the click is on the buttons, do not trigger the event
          return;
        }
        const _ = workflow_components;
        const { id, config } = event.data;
        const component = component_utils.findComponentInTree(id, config);
        if (component) _.renderComponentSidePanel(component);
      });
    $(`#${elementId}`)
      .find(".diagram-node-buttons .node-remove")
      ?.on("click", component, function (event) {
        const _ = workflow_components;
        _.showNodeDeletionConfirmation(event.data);
      });
    $(`#${elementId}`)
      .find(".component-label>span")
      ?.on("click", component, function (event) {
        const _ = workflow_components;
        const { id, config } = event.data;
        const component = component_utils.findComponentInTree(id, config);
        if (component) console.log(component);
      });
    if (component_utils.shouldHaveRoutingFunction(component)) {
      $(`#${elementId}`)
        .find(".component-label .arrow-path")
        ?.on("click", component, function (event) {
          const _ = workflow_components;
          const { id, config } = event.data;
          const component = component_utils.findComponentInTree(id, config);
          const wf = workflow_components;
          if (wf.mode === "new-line") {
            workflow_toolbox.cancelNewLine();
          }
          _.newLine.originElement = $(
            `#node_${component.id} .diagram-node:first`
          );
          _.newLine.originComponent = component;
          _.newLine.originElement.addClass("selected");

          wf.mode = "new-line";
          $("body").on("keydown", component_utils.handleEscNewLine);
        });
    } else {
      $(`#${elementId}`).find(".component-label .arrow-path")?.remove();
    }
    $(`#${elementId}`)?.on("dragstop", component, _.handleNodePositionChange);

    $(`#${elementId}`)
      .find(".add-next-component, .component-route.component-out")
      ?.on("click", component, function (event) {
        if (!workflow_components.isEdition) return;
        const { selectedComponent } = component_creation;
        selectedComponent.data = event.data;
        selectedComponent.path = event.data?.parent_info?.node_path;
        selectedComponent.parentId = parent_id;
        console.log({ selectedComponent });

        $("#component-creation-modal").modal("show");
      });

    $(`#${elementId}`)
      .find(".diagram-node")
      ?.on("click", component, function (event) {
        const _ = workflow_components;
        if (!_.isEdition) return;
        if (_.mode === "new-line") {
          if (!_.newLine.originElement) {
            _.newLine.originElement = $(this);
            _.newLine.originComponent = component;
            $(this).addClass("selected");
          } else {
            if ($(this).hasClass("selected")) {
              return;
            }
            if (
              _.newLine.originComponent.parent_info?.parent_id !==
              component.parent_info?.parent_id
            ) {
              console.log("Cannot connect components from different parents");
              event.stopPropagation();
              return;
            }
            _.newLine.destinationElement = $(this);
            _.newLine.destinationComponent = component;

            $(this).addClass("selected");
            $("body").off("keydown", component_utils.handleEscNewLine);

            _.newLine.isNewLine = true;
            if (_.newLine.originComponent.routing) {
              const existingRoute = _.newLine.originComponent.routing.find(
                (route) => route.route === _.newLine.destinationComponent.id
              );
              _.newLine.isNewLine = existingRoute === undefined;
              if (!_.newLine.isNewLine) {
                _.newLine.line = _.newLine.originComponent.diagram.lines.find(
                  (l) => l.destination === _.newLine.destinationComponent.id
                )?.line;
              }
            }
            const lineOptions = {
              color: component_utils.constants.routeActiveLineColor,
              size: 2,
              dash: true,
            };
            if (_.newLine.isNewLine) {
              _.newLine.line = new LeaderLine(
                _.newLine.originElement[0],
                _.newLine.destinationElement[0],
                { ...lineOptions }
              );
            } else {
              _.newLine.line?.setOptions({ ...lineOptions });
            }
            workflow_toolbox.renderRoutingSidePanel(
              _.newLine.originComponent,
              _.newLine.destinationComponent
            );
          }
        }
      });
  },
  addComponentSettingsFunctionality: function (component) {
    const _ = this;
    $(`#component-settings-form`)
      .find(".component-name")
      ?.on("change", component, function (event) {
        $(this).trigger("blur");
      });
    $(`#component-settings-form`).on("submit", component, function (event) {
      event.preventDefault();
      event.stopPropagation();
      const component = event.data;
      const _ = workflow_components;
      const name = $(`#component-settings-form .component-name`).val().trim();
      if (!name || name == component.name) {
        return;
      }
      $(`#component-settings-form button, #component-settings-form input`).prop(
        "disabled",
        true
      );
      const data = {
        id: component.id,
        plugin_id: component.plugin_id,
        name: name,
      };
      _.api.updateComponent(
        data,
        function (data) {
          const _component = component_utils.findComponentInTree(
            component.id,
            component.config
          );
          _component.name = name;
          $(`#node_${component.id}`).find(".component-label span").html(name);
          $(`#node_panel_${component.id}`).find(".component-label").html(name);
          $(
            `#component-settings-form button, #component-settings-form input`
          ).prop("disabled", false);
          $(`#component-settings-form`).hide();
          $(`#node_panel_${component.id}`).show();
        },
        function (error) {
          $(
            `#component-settings-form button, #component-settings-form input`
          ).prop("disabled", false);
        }
      );
    });

    $(`#component-settings-form button.cancel-btn`).on(
      "click",
      component,
      function (event) {
        event.preventDefault();
        event.stopPropagation();
        $(`#component-settings-form`).hide();
        $(`#node_panel_${component.id}`).show();
        $(`#routing-component`).show();
      }
    );
  },
  addSidePanelRoutes: function (component) {
    const route_template = document.querySelector(
      "#component-routing-item-template"
    );
    const _ = workflow_components;
    const { routing } = component;
    // clone.attribute("id", `id`);
    for (let i = 0; i < routing.length; i++) {
      const route = routing[i];
      const clone = route_template.content.cloneNode(true);
      const { route: routePath, label } = route;

      const destinationComponent =
        component_utils.findSingleComponentInTree(routePath);

      const elementId = `route_${routePath}`;

      clone.querySelector("div").setAttribute("id", elementId);
      clone.querySelector("div").setAttribute("data-route", routePath);
      $(`.list-group.routes`).append(clone);
      // clone.querySelector(".route-action").innerHTML = action;
      const labelElement = $(`#${elementId} .route-label .value`)
      if (!label) {
        labelElement.addClass("text-muted").html(" -- ");
      } else {
        labelElement.removeClass("text-muted").html(label);
      }

      workflow_toolbox.renderRoutingCondition(
        $(`#${elementId} .route-conditions .value`),
        route
      );
      $(`#${elementId} .route-components`).html(
        `${component.name} → ${destinationComponent.name}`
      );

      $(`#${elementId}`).on(
        "click",
        {
          originComponent: component,
          destinationComponent: destinationComponent,
        },
        function (event) {
          const _ = workflow_components;
          const { originComponent, destinationComponent } = event.data;
          const body = $(".component-route-edition");
          $(".list-group.routes .route-list-item").hide();
          workflow_toolbox.setupRoutingEditionContainer(
            body,
            originComponent,
            destinationComponent,
            function (data) {
              // ON UPDATE
              body.empty();
              $(".list-group.routes .route-list-item").show();
              const elementId = `route_${destinationComponent.id}`;

              const _component = component_utils.findSingleComponentInTree(
                originComponent.id
              );
              _component.routing = data.routing || [];
              const route = _component.routing.find(
                (r) => r.route === destinationComponent.id
              );
              const line = _component.diagram.lines.find(
                (l) => l.destination === destinationComponent.id
              ).line;
              if (line) {
                line.setOptions({
                  middleLabel: route.label,
                });
              }
              $(`#${elementId} .route-label .value`).html(
                route.label ?? " -- "
              );
              workflow_toolbox.renderRoutingCondition(
                $(`#${elementId} .route-conditions .value`),
                route
              );
            },
            function (data) {
              // ON Delete
              body.empty();
              $(".list-group.routes .route-list-item").show();
              const elementId = `route_${destinationComponent.id}`;
              $(`#${elementId}`).remove();
              // $('.list-group.routes .route-list-item').show();
            },
            function () {
              // ON CANCEL
              body.empty();
              $(".list-group.routes .route-list-item").show();
            },
            function (error) {} //
          );
        }
      );

      $(`.list-group.routes`).sortable({
        placeholder: "ui-state-highlight",
      });
      $(".list-group.routes")
        .off("sortupdate")
        .on("sortupdate", component, function (event, ui) {
          $(".list-group.routes").sortable("option", "disabled", true);
          const { id, plugin_id } = event.data;
          const chosen_route = ui.item.data("route");
          let index = 0;
          $(`.list-group.routes > div`).each((i, item) => {
            const routeInList = $(item).data("route");
            if (chosen_route === routeInList) index = i;
          });
          const data = {
            id: id,
            plugin_id: plugin_id,
            route: chosen_route,
            index,
          };

          workflow_components.api.updateRouting(
            data,
            function (response) {
              $(".list-group.routes").sortable("option", "disabled", false);
              const node = component_utils.findNodeInTree(id);
              node.routing = response.routing;
            },
            function (error) {
              $(".list-group.routes").sortable("option", "disabled", false);
              console.log(error);
            }
          );
        });
    }
  },
  showNodeDeletionConfirmation: function (component) {
    const _ = workflow_components;
    if (!_.isEdition) return;
    component_utils.confirmationModal.open(
      "Remove Component",
      `Are you sure you want to delete \"${component.name} - ${component?.plugin_info?.name}\" this component?`,
      function () {
        component_utils.confirmationModal.disableButtons();
        const elementId = `node_${component.id}`;
        $(`#node_${component.id}`).remove();
        $(`#${elementId}`).remove();
        const { id } = component;
        const data = {
          id: id,
          workflow_id: _.workflow_id,
          version_id: _.version_id,
        };
        _.api.deleteComponent(
          data,
          function (data) {
            $(`#node_${component.id}`).remove();
            $(`#${elementId}`).remove();
            // data: components_affected
            workflow_components.removeComponent(id, data);
            _.sidePanel?.close();
            component_utils.confirmationModal.close();
          },
          function (error) {
            component_utils.confirmationModal.enableButtons();
            alert("Error deleting component");
          }
        );
      }
    );
  },
  addMenuButtonsFunctionality: function (elementId, component) {
    // Delete Component
    $(`#${elementId}`)
      .find(".delete-component")
      ?.on("click", component, function (event) {
        workflow_components.showNodeDeletionConfirmation(event.data);
      });
    // END: Delete Component
    if (
      component.node_type !== "node" ||
      component.conditions?.on_fail?.action
    ) {
      $(`#${elementId}`).find(".add-on-fail").hide();
    }
    $(`#${elementId}`)
      .find(".add-on-fail")
      ?.on("click", component, function (event) {
        const _ = workflow_components;
        const { id, config } = event.data;
        const _component = component_utils.findComponentInTree(id, config);
        component_on_fail.addOnFail(_component);
        $(`#${elementId}`).find(".add-on-fail").hide();
      });
    $(`#${elementId}`)
      .find(".print-component")
      ?.on("click", component, function (event) {
        const _ = workflow_components;
        const { id, config } = event.data;
        const _component = component_utils.findComponentInTree(id, config);

        console.log({ _component });
      });
    $(`#${elementId}`)
      .find(".edit-component")
      ?.on("click", component, function (event) {
        const _ = workflow_components;
        const { id, config } = event.data;
        const component = component_utils.findComponentInTree(id, config);

        $(`#component-settings-form`)
          .find(".component-name")
          .val(component.name);
        $(`#component-settings-form`).show();
        $(`#node_panel_${component.id}`).hide();
        $(`#routing-component`).hide();
      });
  },
  getComponentInputElement: function (input) {
    const _ = this;
    const { markup } = utils;
    const {
      id,
      elementId,
      name,
      key,
      data_type,
      expression,
      json_value,
      index,
      required,
    } = input;
    const multi = json_value?.multi || false;
    const variable_only = json_value?.variable_only || false;
    const value_only = json_value?.value_only || false;
    const options = json_value?.options || [];
    const default_value = json_value?.default_value || "";
    const value_rules = json_value?.value_rules;

    let element = markup("div", "", {
      id: elementId,
      name: key,
      class: "input-value",
    });
    const items = [];
    const container = markup(
      "div",
      [
        multi
          ? ""
          : markup(
              "div",
              markup(
                "div",
                [
                  markup("label", name, { for: key, class: "form-label" }),
                  markup("code", data_type, { class: "data-type" }),
                ],
                {
                  class: "input-label",
                }
              ),
              { class: "col-3" }
            ),

        markup("div", element, { class: multi ? "col-12" : "col-9" }),
      ],
      { class: "row g-2 d-flex justify-content-between mb-1" }
    );

    if (multi) {
      return markup("div", [container, { tag: "div", class: "add-btn" }]);
    }

    return container;
  },

  getComponentOutputElement: function (output) {
    const extractObject = (obj) => {
      const { markup } = utils;
      const { label, key: obj_key, type, data } = obj;
      const container = markup(
        "div",
        [
          {
            tag: "span",
            content: label,
            class: ["tag", `tag-${type}`].join(" "),
          },
        ],
        { class: "output-value" }
      );
      if (type === "object" && data) {
        for (const data_key in data) {
          const obj = data[data_key];
          container.append(extractObject(obj));
        }
      }
      return container;
    };
    const { markup } = utils;
    const { label, key, data_type, data } = output;
    const container = markup("div", "", { id: key, class: "" });
    container.append(
      extractObject({
        label: label,
        key: key,
        type: data_type,
        data: data,
      })
    );

    return container;
  },
  renderComponentSidePanel: function (component) {
    const { markup } = utils;
    const _ = workflow_components;
    const { isEdition } = _;
    _.sidePanel.open();

    const body = _.sidePanel.find(".offcanvas-body");
    const header = _.sidePanel.find(".offcanvas-header .offcanvas-title");
    header.html("Component edition");
    body.empty();

    const { id, name } = component;
    const { inputs, outputs } = component.config;
    const inputArray = inputs || [];
    const outputArray = outputs || [];

    const template = document.querySelector("#component-side-panel-template");
    const templateSettings = document.querySelector(
      "#component-setting-side-panel-template"
    );
    const templatePluginInfo = document.querySelector("#plugin-info-template");
    const clone = template.content.cloneNode(true);
    const cloneSettings = templateSettings.content.cloneNode(true);
    const elementId = `node_panel_${id}`;
    clone.querySelector(".component-side-node").setAttribute("id", elementId);
    clone
      .querySelector(".component-side-node")
      .setAttribute("data-component-id", id);

    body.append(templatePluginInfo.content.cloneNode(true));
    body.append(cloneSettings);
    // Settings setup
    $(`#component-settings-form`).find(".component-name").val(name);
    // $(`#component-settings-form`).find("button").hide();
    _.addComponentSettingsFunctionality(component);
    // End Settings setup

    body.append(clone);
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
    body.find(".plugin-name").html(component?.plugin_info?.name);
    body.find(".plugin-description").html(component?.plugin_info?.description);
    body
      .find("i")
      .first()
      .attr("class", component.ui?.icon_class ?? "bi bi-gear");

    $(_.sidePanel).on("click", function (event) {
      if ($(event.target).hasClass("slide-out-panel"))
        component_utils.closePopovers();
    });

    $(`#${elementId}`).find(".component-label").html(name);
    for (let i = 0; i < inputArray.length; i++) {
      const input = inputArray[i];
      const divElementId = `${elementId}_${input.key}`;
      const inputElement = _.getComponentInputElement({
        ...input,
        elementId: divElementId,
      });
      $(`#${elementId}`).find(".list-group.input").append(inputElement);

      $(
        `#${divElementId}.input-value, #${divElementId}_array .input-value`
      ).valueSelector({
        input: input,
        component: component,
        isEdition: _.isEdition,
        portal: $(body).find(".panel-value-edition"),
      });
    }
    if (outputArray.length > 0) {
      $(`#${elementId}`).find(".list-group.output").show();
    }
    for (let i = 0; i < outputArray.length; i++) {
      const output = outputArray[i];
      const divElementId = `${elementId}_${output.key}`;
      const outputElement = _.getComponentOutputElement({
        ...output,
      });
      $(`#${elementId}`).find(".list-group.output").append(outputElement);
    }

    if (!isEdition) {
      $(`#${elementId}`).find(".delete-component").remove();
      $(`#${elementId}`).find(".edit-component").remove();
      $(`#${elementId}`).find(".add-on-fail").remove();
    }

    _.addSidePanelRoutes(component);
    _.addMenuButtonsFunctionality(elementId, component);
    component_on_fail.showOnFailConfig(component);
  },
  api: {
    addComponent: function (data, success_callback, error_callback) {
      const _ = workflow_components;
      const component_route = data.route;

      return new Promise((resolve, reject) => {
        $.ajax({
          url: _.var.base_url,
          type: "POST",
          headers: { "X-CSRFToken": $("#csrf_token").val() },
          contentType: "application/json",
          data: JSON.stringify({
            ...data,
            workflow_id: _.workflow_id,
            version_id: _.version_id,
          }),
          success: function (data) {
            let component_list_affected = _.var.components;
            let parentNode = null;
            if (data.parent_info && data.parent_info.parent_id) {
              parentNode = component_utils.findSingleComponentInTree(
                data.parent_info.parent_id
              );
              if (
                parentNode.config[parentNode.node_type] &&
                parentNode.config[parentNode.node_type][
                  data.parent_info.node_path
                ]
              ) {
                component_list_affected =
                  parentNode.config[parentNode.node_type][
                    data.parent_info.node_path
                  ];
              }
            }

            component_list_affected.push(data);

            $(".main-add-component").hide();

            const appendPosition = { position: "after", container: null };
            if (component_route) {
              appendPosition.container = $(`#node_${component_route}`);
            }

            if (data.conditions.is_entry && parentNode) {
              appendPosition.position = "before";
              appendPosition.container = $(
                component_utils.getComponentPrependSelector(
                  parentNode,
                  data.parent_info.node_path
                )
              );
            }
            // renders component in diagram
            _.appendComponent(data, _.container, appendPosition);
            if (_.isEdition) _.makeComponentDraggable(data);

            if (_.var.components.length === 1) {
              _.renderFirstLine(data);
            }
            if (parentNode) {
              if (parentNode.config.branch) {
                component_utils.render.renderOuterBranchLines(parentNode);
              }
            }
            _.renderRoutingLine(data);
            let existingRouteID = null;
            if (data.routing && data.routing.length > 0) {
              const newNextNode = component_utils.findSingleComponentInTree(
                data.routing[0].route
              );
              if (
                newNextNode &&
                newNextNode.diagram.lines.find(
                  (line) => line.source === component_route
                )
              ) {
                existingRouteID = newNextNode.id;
                const existingRoute = newNextNode.diagram.lines.find(
                  (line) => line.source === component_route
                );
                existingRoute.line?.remove();
                newNextNode.diagram.lines = newNextNode.diagram.lines.filter(
                  (line) => line.source !== component_route
                );
              }
            }

            if (component_route) {
              const source_component =
                component_utils.findSingleComponentInTree(component_route);
              if (source_component) {
                source_component.routing.push({
                  route: data.id,
                  conditions: {},
                  label: "",
                  action: "route",
                });
                if (existingRouteID) {
                  source_component.diagram.lines =
                    source_component.diagram.lines.filter(
                      (r) => r.destination !== existingRouteID
                    );
                }
                _.renderRoutingLine(source_component, data.id);
              }
            }
            _.updateLines();
            $(`#node_${data.id}`).find(".diagram-node").trigger("click");
            resolve(data);
          },
          error: function (error) {
            reject(error);
          },
        });
      });
    },
    updateComponent: function (data, success_callback, error_callback) {
      const _ = workflow_components;
      $.ajax({
        url: _.var.base_url + data.id + "/update_component/",
        type: "PUT",
        headers: { "X-CSRFToken": $("#csrf_token").val() },
        contentType: "application/json",
        data: JSON.stringify({
          ...data,
          workflow_id: _.workflow_id,
          version_id: _.version_id,
        }),
        success: success_callback,
        error: error_callback,
      });
    },
    refreshComponentData: function (data, success_callback, error_callback) {
      const _ = workflow_components;
      const params = {
        workflow_id: _.workflow_id,
        version_id: _.version_id,
      };
      const queryParams = utils.make_query_params(params);
      $.ajax({
        url: _.var.base_url + data.id + "/?" + queryParams,
        type: "GET",
        headers: { "X-CSRFToken": $("#csrf_token").val() },
        contentType: "application/json",
        data: JSON.stringify({
          ...data,
          workflow_id: _.workflow_id,
          version_id: _.version_id,
        }),
        success: success_callback,
        error: error_callback,
      });
    },
    updateRouting: function (data, success_callback, error_callback) {
      const _ = workflow_components;
      $.ajax({
        url: _.var.base_url + data.id + "/update_routing/",
        type: "PUT",
        headers: { "X-CSRFToken": $("#csrf_token").val() },
        contentType: "application/json",
        data: JSON.stringify({
          ...data,
          workflow_id: _.workflow_id,
          version_id: _.version_id,
        }),
        success: (response) => {
          success_callback(response);
        },
        error: error_callback,
      });
    },
    updateComponentInputValue: function (data) {
      const _ = workflow_components;
      return new Promise((resolve, reject) => {
        $.ajax({
          url: _.var.base_url + data.component_id + "/update_input_value/",
          type: "PUT",
          headers: { "X-CSRFToken": $("#csrf_token").val() },
          contentType: "application/json",
          data: JSON.stringify({
            ...data,
            workflow_id: _.workflow_id,
            version_id: _.version_id,
          }),
          success: function (response) {
            resolve(response);
          },
          error: function (error) {
            reject(error);
          },
        });
      });
    },
    deleteComponent: function (data, success_callback, error_callback) {
      const _ = workflow_components;
      const { id, workflow_id } = data;
      const _params = {
        workflow_id: workflow_id,
        version_id: _.version_id,
      };
      const queryParams = utils.make_query_params(_params);

      $.ajax({
        url: _.var.base_url + id + "/?" + queryParams,
        type: "DELETE",
        headers: { "X-CSRFToken": $("#csrf_token").val() },
        contentType: "application/json",
        success: success_callback,
        error: error_callback,
      });
    },
  },

  fetchPluginDefinitions: function (workflow_id, searchTerm = "") {
    const promise = new Promise((resolve, reject) => {
      const _ = workflow_components;
      $.ajax({
        // url: "/bwf/api/component-definitions/",
        url: `/bwf/api/plugin-definitions/?workflow_id=${workflow_id}&search=${searchTerm}`,
        type: "GET",
        success: function (data) {
          _.pluginDefinitions = data;
          resolve(data);
        },
        error: function (error) {
          console.error(error);
          reject(error);
        },
      });
    });
    return promise;
  },

  updateInputValue: function (component_data, key, value, json_value) {
    const { id, config } = component_data;
    const _ = workflow_components;
    const component = component_utils.findComponentInTree(id, config);
    if (component) {
      const input = component.config.inputs.find((input) => input.key === key);
      if (input) {
        input.value = value;
        input.json_value = json_value;
      }
    }
  },
  removeComponent: function (id, nodes_affected = []) {
    const _ = workflow_components;
    const component = component_utils.findSingleComponentInTree(id);
    if (!component) {
      console.error("Component not found", id);
      return;
    }
    component_utils.removeComponentDiagram(component);
    $(`#node_${component.id}`).off("drag.line_out");
    $(`#node_${component.id}`).off("drag.line_in");

    for (let i = 0; i < nodes_affected.length; i++) {
      const node_affected = component_utils.findSingleComponentInTree(
        nodes_affected[i].id
      );
      node_affected.routing = nodes_affected[i].routing;
      node_affected.diagram.lines
        .filter((route) => route.destination)
        .forEach((route) => {
          try {
            route.line?.remove();
          } catch (error) {}
        });
      node_affected.diagram.lines = node_affected.diagram.lines.filter(
        (route) => route.source
      );
      _.renderRoutingLine(node_affected);

      console.log("node_affected", node_affected["name"]);
    }

    component_utils.removeNodeFromTree(id);
    _.updateLines();

    if (_.var.components.length === 0) {
      $(".main-add-component").show();
      _.firstLine?.remove();
    }
  },
  updateLines: function (tree) {
    const _ = workflow_components;
    if (!tree) tree = _.var.components;

    for (let i = 0; i < tree.length; i++) {
      const component = tree[i];
      const { node_type } = component;
      if (!node_type) return;
      if (node_type !== "node") {
        const paths = Object.values(component["config"][node_type]);
        for (let path in paths) {
          _.updateLines(paths[path]);
        }
      }
      component.diagram?.lines?.forEach((route) => {
        try {
          route?.line?.position();
        } catch (error) {}
      });
      if (component.config.branch) {
        // component.diagram?.position && component.diagram.position(component);
      }
    }
  },
};
