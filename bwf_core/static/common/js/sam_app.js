var sam_dashboard = {
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
    breadcrumb: [],
    root: "",
    location: "",
    isDownloading: false,
  },

  init: function () {
    const _ = sam_dashboard;
    const params = new URL(document.location.toString()).searchParams;

    _.var.hasInit = false;
    _.var.page = Number(params.get("page")) || 1;
    _.var.page_size = Number(params.get("page_size")) || 10;

    _.var.search = params.get("search") ?? "";

    _.var.location = window.location.href.split("?")[0];
    _.enableSyncButton();
    _.renderDataTable();
  },
  enableSyncButton: function () {
    $("#sync-btn").on("click", function (e) {
      const _ = sam_dashboard;
      if (!_.var.hasInit) return;
      const params = new URL(document.location.toString()).searchParams;

      _.var.hasInit = false;
      _.var.page = 1;
      _.var.page_size = Number(params.get("page_size")) || 10;
      _.dt.state({
        start: (_.var.page - 1) * _.var.page_size,
        length: _.var.page_size,
        route_path: _.var.route_path,
      });
      _.dt.search(_.var.search);
      _.dt.draw(true);
    });
  },
  renderDataTable: function () {
    const _ = sam_dashboard;
    _.dt = $("#sam_dashboard table").DataTable({
      serverSide: true,

      language: utils.datatable.common.language,
      ajax: function (data, callback, settings) {
        if (!_.var.hasInit) {
          _.var.hasInit = true;
        } else {
          _.var.page = data && data.start ? data.start / data.length + 1 : 1;
          _.var.page_size = data?.length;
          _.var.search = data?.search?.value;
        }
        $("#sync-btn").attr("disabled", true);

        _.get_datatable_data(
          {
            page: _.var.page,
            page_size: _.var.page_size,
            search: _.var.search,
            draw: data?.draw,
          },
          function (response) {
            const { count, results } = response;
            $("#sync-btn").removeAttr("disabled");
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
      columns: [
        {
          title: "Hash",
          data: "hash",
          render: function (data, type, row) {
            const { markup } = utils;
            return markup(
              "div",
              [
                {
                  tag: "div",
                  content: row.layer_name,
                  class: "layer_name",
                },
                {
                  tag: "div",
                  content: row.hash,
                  class: "hash",
                },
              ],
              {
                class: "row-hash",
                "data-id": row.id,
              }
            );
          },
        },
        {
          title: "Created at",
          data: "created_at",
          render: function (data, type, row) {
            const { markup } = utils;
            return markup("div", new Date(Date.parse(data)).toLocaleString());
          },
        },
        {
          title: "Synced at",
          data: "synced_at",
          render: function (data, type, row) {
            if (!data) return " - ";
            const { markup } = utils;
            return markup("div", new Date(Date.parse(data)).toLocaleString());
          },
        },
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
    const _ = sam_dashboard;
    const _params = {
      page: params?.page ?? _.var.page,
      page_size: params?.page_size ?? _.var.page_size,
      search: params?.search ?? "",
    };
    const queryParams = utils.make_query_params(_params);
    history.replaceState(null, null, "?" + queryParams.toString());

    $.ajax({
      url: _.var.url + "?" + queryParams,
      method: "GET",
      dataType: "json",
      contentType: "application/json",
      success: cb_success,
      error: cb_error,
    });
  },
};
