var component_on_fail = {
  fillInValues: function (condition_on_fail) {
    const { retry_interval, max_retries, action } = condition_on_fail || {};
    const form = $("#component-on-fail-form");
    form.find("select.component-on-fail").val(action);
    component_on_fail.showRetry(action === "retry");
    form.find("input.component-interval").val(retry_interval || "");
    form.find("input.component-max-retries").val(max_retries || "");
  },
  showRetry: function (isRetry) {
    const form = $("#component-on-fail-form");
    if (isRetry) {
      form.find(".field-retries, .field-interval").show();
      form.find("input.component-max-retries").focus();
    } else {
      form.find(".field-retries, .field-interval").hide();
    }
  },
  showOnFailConfig: function (component) {
    if (
      component.node_type !== "node" ||
      !component.conditions?.on_fail?.action
    )
      return;
    component_on_fail.addOnFail(component);
  },
  addOnFail: function (component) {
    const { id, name, conditions } = component;
    if (component.node_type !== "node") return;
    const { on_fail } = conditions;
    const elementId = `node_panel_${id}`;
    const template = document.querySelector("#component-on-fail-template");
    const clone = template.content.cloneNode(true);
    $(`#${elementId}`).find(".list-group.on-fail").append(clone);
    component_on_fail.fillInValues(on_fail || {});

    if (on_fail) {
      $(`#${elementId}`).find(".on-fail-btns").hide();
    }

    const form = $("#component-on-fail-form");
    form
      .find("select.component-on-fail")
      .on("change", component, function (event) {
        const component = event.data;
        const val = $(this).val();
        component_on_fail.showRetry(val === "retry");
        form.find(".on-fail-btns").show();
      });
    form.find("input[type='number']").on("keyup", component, function (event) {
      const component = event.data;
      const val = $(this).val();
      form.find(".on-fail-btns").show();
    });

    form.on("submit", component, function (event) {
      event.preventDefault();
      const component = event.data;
      const action = form.find("select.component-on-fail").val();
      const interval = form.find("input.component-interval").val();
      const max_retries = form.find("input.component-max-retries").val();

      const isRetry = action === "retry";
      if (isRetry) {
        if (max_retries === "" || max_retries <= 1) {
          alert("Please specify the number of retries. Greater or equal to 1");
          form.find("input.component-max-retries").focus();
          return;
        }
      }
      const data = {
        id: component.id,
        plugin_id: component.plugin_id,
        on_fail: {
          action,
          retry_interval: isRetry ? parseInt(interval) || 1 : null,
          max_retries: isRetry ? parseInt(max_retries) || 0 : null,
        },
      };
      form.find("button, input").prop("disabled", true);

      workflow_components.api.updateComponent(
        data,
        function (response) {
          component_on_fail.fillInValues(response.conditions?.on_fail);
          form.find(".on-fail-btns").hide();
          form.find("button, input").prop("disabled", false);
        },
        function (error) {
          form.find("button, input").prop("disabled", false);
          console.error(error);
        }
      );
    });

    form.find(".on-fail-btns .btn-cancel").on("click", function (event) {
      const form = $(this).closest("form");
      component_on_fail.fillInValues(component.conditions);
      if (!component.conditions?.on_fail) {
        $(`#${elementId}`).find(".list-group.on-fail").empty();
      } else {
        form.find(".on-fail-btns").hide();
      }
    });

    form.find(".btn-remove").on("click", component, function (event) {
      const component = event.data;

      const data = {
        id: component.id,
        plugin_id: component.plugin_id,
        on_fail: {
          is_remove_config: true,
        },
      };
      form.find("button, input").prop("disabled", true);
      workflow_components.api.updateComponent(
        data,
        function (response) {
          const _component = component_utils.findComponentInTree(
            response.id,
            response.config
          );
          _component.conditions = response.conditions;
          $(`#${elementId}`).find(".list-group.on-fail").empty();
          $(`#${elementId}`).find(".add-on-fail").show();
          form.find("button, input").prop("disabled", false);
        },
        function (error) {
          form.find("button, input").prop("disabled", false);
          console.error(error);
        }
      );
    });
  },

  render: {},
};
