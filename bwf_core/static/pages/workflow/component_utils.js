var component_utils = {
  constants: {
    routeLineColor: "#4076c6",
    routeStartLineColor: "#249bee36",
    routeActiveLineColor: "#ff6700",
    lineStyle: {
      color: "#4076c6",
      startPlugColor: "#249bee36",
      gradient: true,
      size: 1,
      endPlugSize: 2,
      path: "grid",
    },
  },
  confirmationModal: {
    element: $("#confirmation-modal"),
    open: function (title, message, onConfirm = () => {}, onCancel = () => {}) {
      const modal = $("#confirmation-modal");
      modal.find(".modal-title").html(title);
      modal.find(".modal-body").html(message);
      modal.find(".confirm-button").off("click").on("click", onConfirm);
      modal
        .find(".close-button")
        .off("click")
        .on("click", function (event) {
          event.stopPropagation();
          onCancel();
          component_utils.confirmationModal.close();
        });
      modal.off("hide.bs.modal").on("hide.bs.modal", function () {
          onCancel();
      });
      modal.modal("show");
    },
    close: function () {
      const modal = $("#confirmation-modal");
      modal.find(".modal-title").text("");
      modal.find(".modal-body").text("");
      modal.find(".confirm-button").off("click");
      modal.find(".close-button").off("click");
      modal.find(".confirm-button").attr("disabled", false);
      modal.find(".close-button").attr("disabled", false);
      modal.modal("hide");
    },
    disableButtons: function () {
      const modal = $("#confirmation-modal");
      modal.find(".confirm-button").attr("disabled", true);
      modal.find(".close-button").attr("disabled", true);
    },
    enableButtons: function () {
      const modal = $("#confirmation-modal");
      modal.find(".confirm-button").attr("disabled", false);
      modal.find(".close-button").attr("disabled", false);
    },
  },
  adjustWorkflowContainerHeight: function () {
    // check node position inside container
    const _ = workflow_components;
    const minHeight = 500;
    const container = _.container;
    workflow_components.var.components.forEach((component) => {
      const node = $(`#node_${component.id}`);
      if(!node || node.length === 0) return;
      const containerTop = container.position().top;
      const containerHeight = container.height();
      const {top: nodeTop} = node?.position();
      const nodeHeight = node.height();
      if (nodeTop === undefined) {
        debugger
        return
      }
      const lowerBound = containerTop + containerHeight;
      const nodeLowerBound = nodeTop + nodeHeight;

      if (nodeLowerBound > lowerBound) {
        
        container.css("height", `${nodeLowerBound}px`);
        // _.container.css("height", `${nodeLowerBound}px`);
        // _.container.position();
      }
    })
  },
  removeComponentDiagram: function (component) {
    if (component && component.diagram) {
      component.diagram.lines?.forEach((route) => {
        try {
          route.line?.remove();
          if (route.destination) {
            const destinationNode = component_utils.findSingleComponentInTree(
              route.destination
            );
            if (destinationNode) {
              destinationNode.diagram.lines =
                destinationNode.diagram.lines.filter(
                  (route) =>
                    (route.source && route.source !== component.id) ||
                    (route.destination && route.destination !== component.id)
                );
            }
          }
        } catch (error) {}
      });
      if (component.config.branch) {
        component_utils.render.removeBranchLines(component);
      }
      if (component.config.loop) {
        component_loop.render.removeLoopLines(component);
      }
    }
  },
  markupErrors: function (errors) {
    const notifContainer = $("#notifications-container");
    if (errors.length > 0) {
      errors.forEach((error) => {
        notifContainer.append(
          `<div class="alert alert-danger" role="alert">${
            error?.error || ""
          }</div>`
        );
      });
    } else {
      notifContainer.append(
        `<div class="alert alert-success" role="alert">Input deleted successfully</div>`
      );
    }
  },
  getComponentPrependSelector: function (parentComponent, path) {
    if (parentComponent.node_type === "branch") {
      if (path === "True") {
        return `#node_${parentComponent.id} .branch-true .workflow:first`;
      }
      if (path === "False") {
        return `#node_${parentComponent.id} .branch-false .workflow:first`;
      }
    }
    if (parentComponent.node_type === "loop") {
      return `#node_${parentComponent.id} .loop-workflow:first`;
    }
  },
  closePopovers: function (value_selector) {
    $(".popover.show").each(function () {
      if (!value_selector) {
        $(this).popover("hide");
        return;
      }
      if (
        !$(this).is(value_selector.$content) &&
        $(this).has(value_selector.$content).length === 0 &&
        $(".popover").has(value_selector.$content).length === 0
      ) {
        $(this).popover("hide");
      }
    });
  },
  findPreviousNode: function (id, tree) {
    const _ = workflow_components;
    if (!tree) {
      tree = _.var.components;
    }
    for (let i = 0; i < tree.length; i++) {
      const component = tree[i];
      const { node_type } = component;
      if (!node_type) throw new Error("node_type is not defined");
      if (component.conditions.route === id) {
        return component;
      }
      if (node_type !== "node") {
        const paths = Object.values(component["config"][node_type]);
        for (let path in paths) {
          const foundComponent = this.findPreviousNode(id, paths[path]);
          if (foundComponent) {
            return foundComponent;
          }
        }
      }
    }
  },
  findNodeInTree: function (id, tree) {
    const _ = workflow_components;
    if (!tree) {
      tree = _.var.components;
    }
    for (let i = 0; i < tree.length; i++) {
      const component = tree[i];
      const { node_type } = component;
      if (!node_type) throw new Error("node_type is not defined");
      if (component.id === id) {
        return component;
      }
      if (node_type !== "node") {
        const paths = Object.values(component["config"][node_type]);
        for (let path in paths) {
          const foundComponent = this.findNodeInTree(id, paths[path]);
          if (foundComponent) {
            return foundComponent;
          }
        }
      }
    }
  },

  findSingleComponentInTree: function (id, tree) {
    const _ = workflow_components;
    if (!tree) {
      tree = _.var.components;
    }
    for (let i = 0; i < tree.length; i++) {
      const component = tree[i];
      const { node_type } = component;
      if (!node_type) throw new Error("node_type is not defined");
      if (component.id === id) {
        return component;
      }
      if (node_type !== "node") {
        const paths = Object.values(component["config"][node_type]);
        for (let path in paths) {
          const foundComponent = this.findSingleComponentInTree(
            id,
            paths[path]
          );
          if (foundComponent) {
            return foundComponent;
          }
        }
      }
    }
  },
  removeNodeFromTree: function (id, tree) {
    const _ = workflow_components;
    if (!tree) {
      tree = _.var.components;
    }
    for (let i = 0; i < tree.length; i++) {
      const component = tree[i];
      const { node_type } = component;
      if (!node_type) throw new Error("node_type is not defined");
      if (component.id === id) {
        tree.splice(i, 1);
        return component;
      }
      if (node_type !== "node") {
        const paths = Object.values(component["config"][node_type]);
        for (let path in paths) {
          const foundComponent = this.findSingleComponentInTree(
            id,
            paths[path]
          );
          if (foundComponent) {
            const index = paths[path].findIndex((c) => c.id === id);
            if (index >= 0) paths[path].splice(index, 1);
            return foundComponent;
          }
        }
      }
    }
  },
  findComponentInTree: function (id, config) {
    const _ = workflow_components;
    const path = config?.path.split(".") || [];
    const parentId = path ? (path.length > 0 ? path[0] : id) : id;
    let component = _.var.components.find(
      (component) => component.id === parentId
    );
    if (!component) {
      console.error("Component not found", parentId);
      return;
    }
    for (let i = 1; i < path.length; i++) {
      const key = path[i];
      if (Array.isArray(component)) {
        component = component.find((comp) => comp.id === key);
      } else if (component[key]) {
        component = component[key];
      } else {
        console.error("Component not found", key);
        return;
      }
    }
    return component;
  },
  handleEscNewLine: function (event) {
    if (event.key === "Escape") {
      workflow_toolbox.cancelNewLine();
    }
  },
  shouldBeDraggable: function (component) {
    return workflow_components.isEdition && !!!component.parent_info?.parent_id;
  },
  shouldHaveRoutingFunction: function (component) {
    return !!!component.parent_info?.parent_id;
  },

  render: {
    renderBranch: function (elementId, component) {
      const _ = workflow_components;
      // draw branch
      const branch = component.config.branch;
      const branchTrue = branch.True;
      const branchFalse = branch.False;

      const branchTemplate = document.querySelector(
        "#component-branch-template"
      );
      const clone = branchTemplate.content.cloneNode(true);
      const branchElemId = `branch_${component.id}`;
      component.diagram.branchElementId = branchElemId;
      component.diagram.paths = {};
      clone.querySelector("div").id = branchElemId;

      // $(`#node_${component.id}`).find('.component-dot-add').remove();
      $(`#${elementId} .component-label`).after(clone);
      $(`#${elementId} .branch-true .component-out`)
        .attr("data-parent-node-type", "branch")
        .attr("data-path", "True")
        .attr("data-parent-id", component.id)
        .attr("data-parent-node-path", component.config.path || "")
        .attr("data-previous-node", null);
      $(`#${elementId} .branch-false .component-out`)
        .attr("data-parent-node-type", "branch")
        .attr("data-path", "False")
        .attr("data-parent-id", component.id)
        .attr("data-parent-node-path", component.config.path || "")
        .attr("data-previous-node", null);

      // $(`#node_${component.id}`).find(".branch-true").html(branchTrue);

      // draw insides

      _.renderComponents(
        $(`#${branchElemId} .branch-true .workflow`),
        branchTrue
      );
      _.renderComponents(
        $(`#${branchElemId} .branch-false .workflow`),
        branchFalse
      );
      $(`#${branchElemId} .branch-true .component-route.component-out:first,
        #${branchElemId} .branch-false .component-route.component-out:first`)?.on(
        "click",
        component,
        function (event) {
          if (!workflow_components.isEdition) return;

          const { selectedComponent } = component_creation;
          selectedComponent.data = null;
          selectedComponent.path = $(this).data("path");
          selectedComponent.parentId = $(this).data("parent-id");
          selectedComponent.isEntry = true;
          console.log({ selectedComponent });

          $("#component-creation-modal").modal("show");
        }
      );
      component_utils.render.renderBranchLines(component);
      component.diagram.position = function (component) {
        component_utils.render.renderBranchLines(component);
        // component_utils.render.renderOuterBranchLines(component);
      };
    },
    renderBranchLines: function (component) {
      const branchElementId = component.diagram.branchElementId;
      const start = $(`#node_${component.id} .component-label`);
      const lines = [
        {
          path: "True",
          start: start,
          end: $(`#${branchElementId} .branch-true .component-out i`),
          color: component_utils.constants.routeLineColor,
          label: "True",
          startSocket: "left",
          endSocket: "top",
        },
        {
          path: "False",
          start: start,
          end: $(`#${branchElementId} .branch-false .component-out i`),
          color: component_utils.constants.routeLineColor,
          label: "False",
          startSocket: "right",
          endSocket: "top",
        },
      ];
      lines.forEach((line) => {
        if (component.diagram.paths[line.path]) {
          component.diagram.paths[line.path].position();
        } else {
          component.diagram.paths[line.path] = new LeaderLine(
            line.start[0],
            line.end[0],
            {
              ...component_utils.constants.lineStyle,
              middleLabel: line.label,
              startSocket: line.startSocket,
              endSocket: line.endSocket,
            }
          );
        }
      });
    },
    renderOuterBranchLines: function (component) {
      component.diagram.out = component.diagram.out || {};
      if (component.diagram.out.left) {
        component.diagram.out.left.remove();
        delete component.diagram.out.left;
      }
      if (component.diagram.out.right) {
        component.diagram.out.right.remove();
        delete component.diagram.out.right;
      }

      const start = $(`#node_${component.id} .component-out:last`);
      const lines = [
        {
          path: "True",
          end: start,
          start: $(
            `#${component.diagram.branchElementId} .branch-true:first .component-out:last`
          ),
          color: component_utils.constants.routeLineColor,
          startSocket: "bottom",
          endSocket: "left",
          lineRef: "left",
        },
        {
          path: "False",
          end: start,
          start: $(
            `#${component.diagram.branchElementId} .branch-false:first .component-out:last`
          ),
          color: component_utils.constants.routeLineColor,
          startSocket: "bottom",
          endSocket: "right",
          lineRef: "right",
        },
      ];
      lines.forEach((line) => {
        component.diagram.out[line.lineRef] = new LeaderLine(
          line.start[0],
          line.end[0],
          {
            ...component_utils.constants.lineStyle,
            middleLabel: line.label,
            startSocket: line.startSocket,
            endSocket: line.endSocket,
          }
        );
      });
    },
    positionOuterBranchLines: function (component) {
      component.diagram.out = component.diagram.out || {};
      if (component.diagram.out.left) {
        component.diagram.out.left.position();
      }
      if (component.diagram.out.right) {
        component.diagram.out.right.position();
      }
    },

    removeBranchLines: function (component) {
      component.diagram.out = component.diagram.out || {};
      if (component.diagram.out) {
        Object.values(component.diagram.out).forEach((line) => {
          line?.remove();
        });
      }
      if (component.diagram.paths) {
        Object.values(component.diagram.paths).forEach((line) => {
          line?.remove();
        });
      }

      Object.values(component.config.branch).forEach((path) => {
        path.forEach((component) => {
          component_utils.removeComponentDiagram(component);
        });
      });
    },
  },
};
