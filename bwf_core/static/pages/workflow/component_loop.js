var component_loop = {
  render: {
    renderLoop: function (elementId, component) {
      const _ = workflow_components;
      // draw loop
      const loopFlow = component.config.loop.flow;

      const loopTemplate = document.querySelector(
        "#component-loop-template"
      );
      const clone = loopTemplate.content.cloneNode(true);
      const loopElemId = `loop_${component.id}`;
      component.diagram.loopElementId = loopElemId;
      component.diagram.paths = {};
      clone.querySelector("div").id = loopElemId;

      // $(`#node_${component.id}`).find('.component-dot-add').remove();
      $(`#${elementId} .component-label`).after(clone);
      $(`#${elementId} .loop-flow .component-out`)
        .attr("data-parent-node-type", "loop")
        .attr("data-path", "flow")
        .attr("data-parent-id", component.id)
        .attr("data-parent-node-path", component.config.path || "")
        .attr("data-previous-node", null);
      
      // $(`#node_${component.id}`).find(".loop-flow").html(loopTrue);

      // draw insides

      _.renderComponents(
        $(`#${loopElemId} .loop-flow .workflow`),
        loopFlow
      );
      $(`#${loopElemId} .loop-flow .component-route.component-out:first`)?.on(
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
      component_loop.render.renderLoopLines(component);
      component.diagram.position = function (component) {
        component_loop.render.renderLoopLines(component);
        // component_loop.render.renderOuterLoopLines(component);
      };
    },
    renderLoopLines: function (component) {
      const loopElementId = component.diagram.loopElementId;
      const start = $(`#node_${component.id} .component-label:first`);
      const lines = [
        {
          path: "flow",
          start: start,
          end: $(`#${loopElementId} .loop-flow .component-out i`),
          color: component_utils.constants.routeLineColor,
          startSocket: "left",
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
              startSocket: line.endSocket,
              endSocket: line.endSocket,
              path: "straight",
            }
          );
        }
      });
    },
    renderOuterLoopLines: function (component) {
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
            `#${component.diagram.loopElementId} .loop-flow:first .component-out:last`
          ),
          color: component_utils.constants.routeLineColor,
          startSocket: "bottom",
          endSocket: "left",
          lineRef: "left",
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

    removeLoopLines: function (component) {
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
      Object.values(component.config.loop.flow).forEach((component) => {
        component_utils.removeComponentDiagram(component);
      });

    },
  },
};
