var workflow_dashboard = {
  dt: null,
  progressBar: null,
  progressContainer: null,
  var: {
    hasInit: false,
    page: 1,
    page_size: 10,
    search: "",
    url: "/api/list_historical_records/",
    data: [],
    sort_column: "updated_at",
    sort_order: "desc",

    location: "",
  },

  init: function () {
    const _ = workflow_dashboard;
    const params = new URL(document.location.toString()).searchParams;

    _.var.hasInit = false;
    _.var.page = Number(params.get("page")) || 1;
    _.var.page_size = Number(params.get("page_size")) || 10;

    _.var.search = params.get("search") ?? "";

    _.var.location = window.location.href.split("?")[0];

    _.renderDataTable();
  },
  renderDataTable: function () {
    const _ = workflow_dashboard;
    _.dt = $("#tb_workflows").DataTable({
      serverSide: true,
      order: [[2, "desc"]],
      language: utils.datatable.common.language,
      ajax: function (data, callback, settings) {
        const sort = data.order && data.order.length > 0 ? data.order[0] : null;
        if (!_.var.hasInit) {
          _.var.hasInit = true;
        } else {
          _.var.page = data && data.start ? data.start / data.length + 1 : 1;
          _.var.page_size = data?.length;
          _.var.search = data?.search?.value;
          if (sort) {
            _.var.sort_column = sort?.name || "updated_at";
            _.var.sort_order = sort?.dir || "desc";
          }
        }

        _.get_datatable_data(
          {
            page: _.var.page,
            page_size: _.var.page_size,
            search: _.var.search,
            sort_column: _.var.sort_column,
            sort_order: _.var.sort_order,
            draw: data?.draw,
          },
          function (response) {
            const { count, results } = response;
            callback({
              data: results,
              recordsTotal: count,
              recordsFiltered: count,
            });
          },
          function (error) {
            console.error(error);
            alert("There was an error fetching the files");
          }
        );
      },
      headerCallback: function (thead, data, start, end, display) {
        $(thead).addClass("table-light");
      },
      columnDefs: [{ width: "30%", targets: 0 }],
      columns: [
        {
          title: "Workflow",
          data: "name",
          name: "name",
          sortable: true,
          render: function (data, type, row) {
            const { markup } = utils;
            const createdAt = moment(row.created_at).format(
              "DD MMM YYYY HH:mm:ss a"
            );

            return markup(
              "div",
              [
                {
                  tag: "a",
                  content: row.name,
                  class: "layer_name",
                  href: `workflow/${row.id}/`,
                },
                {
                  tag: "div",
                  content: row.description,
                  class: "description",
                },
                {
                  tag: "span",
                  content: createdAt,
                  class: "text-muted description",
                },
              ],
              {
                class: "row-workflow",
                "data-id": row.id,
              }
            );
          },
        },
        {
          title: "Type",
          data: "workflow_type",
          sortable: false,
          render: function (data, type, row) {
            const { markup } = utils;
            const isShortLived = row.workflow_type === "SHORT_LIVED";
            const workflowType = isShortLived ? "Short lived" : "Long lived";
            return markup(
              "div",
              [
                {
                  tag: "span",
                  content: workflowType,
                  class: [
                    "badge",
                    isShortLived ? "short-lived" : "long-lived",
                  ].join(" "),
                },
              ],
              { class: "workflow-type" }
            );
          },
        },
        {
          title: "Last update",
          data: "updated_at",
          name: "updated_at",
          sortable: true,
          render: function (data, type, row) {
            const { markup } = utils;
            const updatedAt = row.updated_at
              ? moment(data).format("DD MMM YYYY HH:mm:ss a")
              : "";
            return markup(
              "div",
              [{ tag: "span", content: updatedAt, class: "" }],
              { class: "dates" }
            );
          },
        },
        {
          // created_at
          title: "Created at",
          data: "created_at",
          name: "created_at",
          sortable: true,
          render: function (data, type, row) {
            const { markup } = utils;
            const createdAt = row.created_at
              ? moment(data).format("DD MMM YYYY HH:mm:ss a")
              : "";
            return markup(
              "div",
              [{ tag: "span", content: createdAt, class: "" }],
              { class: "dates" }
            );
          },
        }
      ],
    });

    _.dt.state({
      start: (_.var.page - 1) * _.var.page_size,
      length: _.var.page_size,
      route_path: _.var.route_path,
    });
    _.dt.search(_.var.search);
  },

  get_datatable_data: function (params, cb_success, cb_error) {
    const _ = workflow_dashboard;
    const _params = {
      page: params?.page ?? _.var.page,
      page_size: params?.page_size ?? _.var.page_size,
      search: params?.search ?? "",
      sort_column: params?.sort_column ?? _.var.sort_column,
      sort_order: params?.sort_order ?? _.var.sort_order,
    };
    const queryParams = utils.make_query_params(_params);
    history.replaceState(null, null, "?" + queryParams.toString());

    $.ajax({
      url: bwf_workflow.var.base_url + "?" + queryParams,
      method: "GET",
      dataType: "json",
      contentType: "application/json",
      success: cb_success,
      error: cb_error,
    });
  },
};
