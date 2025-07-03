component_creation = {
  elements: {
    modal: null,
    form: null,
    searchBox: null,
  },
  var: {
    timeout: null,
    definitions: [],
    components: [],
    pluginDefinitions: [],
  },
  selectedComponent: {
    data: null,
    path: null,
    parentId: null,
    isEntry: false,
  },

  validate: function (data) {
    const {} = data;

    return true;
  },

  init: function () {
    const creation = component_creation;
    const _ = workflow_components;

    creation.var.modal = $("#component-creation-modal");
    creation.var.form = $("#components-form");
    creation.elements.searchBox = creation.var.modal.find("#plugin-search-box");
    creation.elements.searchBox.on("keydown", function (event) {
      const searchTerm = event.target.value.toLowerCase();
      if (event.key === "Enter") {
        event.preventDefault();
        creation.doFetchPluginDefinitions(searchTerm);
      } else {
        creation.debounceSearch(
          creation.doFetchPluginDefinitions,
          600
        )(searchTerm);
      }
    });

    creation.var.modal.on("show.bs.modal", function (e) {
      const _ = workflow_components;
      $(`#components-list`).empty();
      $("#definitions").empty();

      creation.elements.searchBox.val("");
      creation.doFetchPluginDefinitions("");

      const { markup } = utils;
      const { data: component } = component_creation.selectedComponent;

      if (component) {
        const { name, plugin_id } = component;
        $("#component-creation-modal .modal-title span").html(`after ${name}`);
        $("#component-route").show();
      }

      const hasComponents = component ? component.routing.length > 0 : false;
      if (hasComponents) {
        const selectComponents = markup(
          "select",
          [
            {
              tag: "option",
              value: "",
              content: " -- None -- ",
              disabled: false,
              selected: true,
            },
            ...component.routing
              .map((c) => {
                const node = component_utils.findSingleComponentInTree(c.route);
                return { node, c };
              })
              .filter((x) => x.node)
              .map(({ node, c }) => {
                return {
                  tag: "option",
                  value: node.id,
                  content: `${node.name} (${node.plugin_id})`,
                };
              }),
          ],
          { class: "form-select" }
        );
        $(`#components-list`).append(selectComponents);
      } else {
        $("#component-route").hide();
      }
    });

    creation.var.modal.on("hidden.bs.modal", function (e) {
      $("#definitions input[type='radio']").prop("checked", false);
      $("#component-name").val("");
      component_creation.selectedComponent.data = null;
      component_creation.selectedComponent.path = null;
      component_creation.selectedComponent.parentId = null;
      component_creation.selectedComponent.isEntry = false;
    });

    creation.var.modal.find(".close-button").on("click", function () {
      creation.var.modal.modal("hide");
    });

    creation.var.form
      .off("submit")
      .off("submit")
      .on("submit", function (e) {
        e.preventDefault();

        const _ = workflow_components;
        const value = $("#definitions input:checked").val();
        const insertBefore = $("#components-list select").val() ?? null;
        const hasComponents = _.var.components.length > 0;
        const {
          data: component,
          path,
          parentId,
          isEntry,
        } = component_creation.selectedComponent;

        if (hasComponents && !component && !isEntry) {
          alert("Please select a component to insert after.");
          return;
        }
        if (value) {
          $(".create-component-button").prop("disabled", true);

          const name = $("#component-name").val() ?? "New Component";

          const data = {
            plugin_id: creation.var.selectedPluginId,
            index: 0,
            name: name,
            route: component?.id ? component.id : null,
            parent_id: parentId,
            insert_before: insertBefore,
            path: path,
            is_entry: isEntry,
          };
          _.api
            .addComponent(data)
            .then((data) => {
              const refreshInputsFlag = !!data.refresh_inputs;
              if (refreshInputsFlag) {
                workflow_inputs.api.refreshInputs();
              }

              $(".create-component-button").prop("disabled", false);
              $("#component-creation-modal").modal("hide");
            })
            .catch((error) => {
              $(".create-component-button").prop("disabled", false);
              alert("An error occurred while creating the component.");
            });
        } else {
          alert("Please select a component definition.");
        }
      });
  },

  render: {
    pluginDefinitions: function (plugins) {
      const { markup } = utils;

      $("#definitions").empty();
      plugins.forEach((plugin, index) => {
        $("#definitions").append(
          markup(
            "div",
            [
              {
                tag: "input",
                class: "list-group-item-check pe-none",
                type: "radio",
                name: "definition-radio",
                id: `listGroupCheckableRadios${index}`,
                value: plugin.id,
              },

              {
                tag: "label",
                content: [
                  {
                    tag: "i",
                    class: [plugin.icon_class ?? "bi bi-gear", "me-2"].join(
                      " "
                    ),
                  },
                  plugin.name,
                  {
                    tag: "span",
                    content: plugin.description,
                    class: "d-block small text-muted",
                  },
                ],
                class: "list-group-item rounded-3 py-1 my-1",
                for: `listGroupCheckableRadios${index}`,
              },
            ],
            { class: "col-6" }
          )
        );
      });
      $("#definitions input[type='radio']").on("change", function (event) {
        const creation = component_creation;
        creation.var.selectedPluginId = $(this).val();
        const componentId = $("#definitions input:checked").val();
        const component = creation.var.definitions.find(
          (definition) => definition.id == componentId
        );
        if (component) {
          $("#component-name").val(component.name).trigger("focus");
        }
      });
    },
  },
  doFetchPluginDefinitions: function (searchTerm) {
    const _ = workflow_components;
    const creation = component_creation;
    const workflowId = _.workflow_id ?? null;

    _.fetchPluginDefinitions(workflowId, searchTerm).then((data) => {
      creation.var.definitions = data;
      creation.render.pluginDefinitions(data);
      if (data.length === 0) {
        $("#definitions").append(
          `<div class="alert alert-info" role="alert">
            No components found.
          </div>`
        );
      }
    });
  },
  debounceSearch: function (func, delay) {
    const _ = component_creation;

    if (_.var.timeout) {
      clearTimeout(_.var.timeout);
    }

    return function (...args) {
      const context = this;
      clearTimeout(_.var.timeout);
      _.var.timeout = setTimeout(() => func.apply(context, args), delay);
    };
  },
};
