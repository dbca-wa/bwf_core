var component_utils = {
  getComponentPrependSelector: function (parentComponent, path) {
    if (parentComponent.node_type === "branch") {
      if (path === "True") {
        return `#node_${parentComponent.id} .branch-true .workflow`;
      }
      if (path === "False") {
        return `#node_${parentComponent.id} .branch-false .workflow`;
      }
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

          const { selectedComponent } = new_component_data;
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
        component_utils.render.renderOuterBranchLines(component);
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
          color: "#6cb0be",
          label: "True",
          startSocket: "left",
          endSocket: "top",
        },
        {
          path: "False",
          start: start,
          end: $(`#${branchElementId} .branch-false .component-out i`),
          color: "#6cb0be",
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
              color: line.color,
              size: 2,
              middleLabel: line.label,
              startSocket: line.startSocket,
              endSocket: line.endSocket,
              path: "grid",
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
          color: "#6cb0be",
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
          color: "#6cb0be",
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
            color: line.color,
            size: 2,
            middleLabel: line.label,
            startSocket: line.startSocket,
            endSocket: line.endSocket,
            path: "grid",
          }
        );
      });
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
    },
  },
};
