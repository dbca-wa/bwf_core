var utils = {
  make_query_params: function (params) {
    var url_params = "";

    if (params) {
      for (var key in params) {
        if (params[key]) url_params += "&" + key + "=" + params[key];
      }
    }
    return url_params;
  },
  formatFileSize: function (bytes) {
    if (bytes === 0) return "0 Bytes";
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + sizes[i];
  },
  generateRandomId: function () {
    return Math.random().toString(36).slice(2, 10);
  },
  hyphenCase: function (str) {
    // eslint-disable-next-line no-useless-escape
    str = str.replace(/[^\w\s\-]/gi, "");
    str = str.replace(/([A-Z])/g, function ($1) {
      return "-" + $1.toLowerCase();
    });

    return str.replace(/\s/g, "-").replace(/^-+/g, "");
  },
  safeAttrName: function (name) {
    const safeAttr = {
      className: "class",
    };

    return safeAttr[name] || utils.hyphenCase(name);
  },
  setElementContent: function (element, content, asText = false) {
    if (asText) {
      element.textContent = content;
    } else {
      element.innerHTML = content;

      return element;
    }
  },
  getContentType: function (content) {
    if (content === undefined) {
      return content;
    }

    return [
      ["array", (content) => Array.isArray(content)],
      [
        "node",
        (content) =>
          content instanceof window.Node ||
          content instanceof window.HTMLElement,
      ],
      ["component", () => content && content.dom],
      [typeof content, () => true],
    ].find((typeCondition) => typeCondition[1](content))[0];
  },
  bindEvents: function (element, events) {
    if (events) {
      for (const event in events) {
        if (events.hasOwnProperty(event)) {
          const eventObjType = utils.getContentType(events[event]);
          if (eventObjType === "function") {
            element.addEventListener(event, (evt) => events[event](evt));
          } else if (eventObjType === "object") {
            const { fn, ...options } = events[event];
            $(element).on(event, options, fn);
          }
        }
      }
    }
  },
  markup: function (tag, content = "", attributes = {}) {
    let contentType = utils.getContentType(content);
    const { events, ...attrs } = attributes;
    const field = document.createElement(tag);

    const appendContent = {
      string: (content) => {
        utils.setElementContent(field, field.innerHTML + content);
      },
      number: (content) => {
        utils.setElementContent(field, field.innerHTML + content);
      },
      object: (config) => {
        const { tag, content, ...data } = config;
        return field.appendChild(utils.markup(tag, content, data));
      },
      node: (content) => {
        return field.appendChild(content);
      },
      array: (content) => {
        for (let i = 0; i < content.length; i++) {
          contentType = utils.getContentType(content[i]);
          appendContent[contentType](content[i]);
        }
      },
      function: (content) => {
        content = content();
        contentType = utils.getContentType(content);
        appendContent[contentType](content);
      },
      undefined: () => {},
    };

    for (const attr in attrs) {
      if (attrs.hasOwnProperty(attr)) {
        const name = utils.safeAttrName(attr);
        let attrVal = Array.isArray(attrs[attr])
          ? unique(attrs[attr].join(" ").split(" ")).join(" ")
          : attrs[attr];

        if (typeof attrVal === "boolean") {
          if (attrVal === true) {
            const val = name === "contenteditable" ? true : name;
            field.setAttribute(name, val);
          }
        } else {
          /* if (name === 'id' || name === 'name') {
                  attrVal = sanitizeNamedAttribute(attrVal);
                } */
          if (attrVal !== undefined) {
            field.setAttribute(name, attrVal);
          }
        }
      }
    }

    if (content) {
      appendContent[contentType](content);
    }

    utils.bindEvents(field, events);

    return field;
  },
  validate_email: function (email) {
    if (!email) return false;
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    $("#common-entity-modal-error").hide();
    if (!emailRegex.test(email)) {
      throw new Error("Wrong email format.");
    }
    return email;
  },
  validate_empty_input: function (key, val, msg = key + " is required.") {
    if (!val) {
      throw new Error(msg);
    }
    return val;
  },
  validate_number: function (
    key,
    val,
    msg = "Please enter a valid " + key + ". (must be positive number)"
  ) {
    if (isNaN(val) || val < 0) {
      throw new Error(msg);
    }
    return val;
  },
  convert_date_format: function (date_str, format, hh, mm, ss) {
    if (!date_str) return null;
    // make a moment object by original format
    let original_format = format.toUpperCase() + "-hh:mm:ss";
    date_str = date_str + "-" + hh + ":" + mm + ":" + ss;
    let target_format = "YYYY-MM-DDTHH:mm:ss";
    let converted_str = this.convert_datetime_format(
      date_str,
      target_format,
      original_format
    );
    return converted_str;
  },
  convert_datetime_format: function (
    datetime_str,
    target_format,
    original_format
  ) {
    if (!datetime_str) return null;
    let original_datetime;
    if (original_format) {
      // make a moment object by original format
      original_datetime = moment(datetime_str, original_format);
    } else {
      original_datetime = moment(datetime_str);
    }

    return original_datetime.format(target_format);
  },
  call_get_api: function (url, success_callback, error_callback) {
    $.ajax({
      url: url,
      type: "GET",
      contentType: "application/json",
      success: (response) => {
        if (!response || !response.results) {
          error_callback();
          return;
        }
        success_callback();
      },
      error: error_callback,
    });
  },
  enter_keyup: function (text_input, callback) {
    text_input.on("keyup", function (e) {
      if (e.keyCode === 13) {
        // eneter key
        callback();
      }
    });
  },
  register_prevent_from_leaving: function (tip_obj) {
    window.onbeforeunload = function () {
      if (tip_obj && tip_obj.isDownloading) {
        return "A download is in progress. Are you sure you want to leave?";
      } else {
        return;
      }
    };
  },

  datatable: {
    common: {
      language: {
        loadingRecords: function () {
          return utils.markup(
            "div",
            utils.markup("div", "", {
              class: "spinner-border text-secondary",
              role: "status",
            }),
            { class: "d-flex justify-content-center my-4" }
          );
        },
      },
    },
  },
  generate_key_value: function (input) {
    const chars = [
      "!",
      "@",
      "#",
      "$",
      "%",
      "^",
      "&",
      "*",
      "(",
      ")",
      "-",
      "+",
      "'",
      '"',
      ".",
      ",",
      "<",
      ">",
      "?",
      "/",
      "\\",
      "|",
      "[",
      "]",
      "{",
      "}",
      "=",
      "~",
      "`",
      ":",
      ";",
    ]
      .map((a) => "\\" + a)
      .join("|");
      if (input.length > 0) {
        input = (input[0].toLowerCase()) + input.slice(1);
      }
    return input
      .trim()
      .split(/\ |\_/g)
      .map((a) => a.replace(new RegExp(chars, "g"), ""))
      .join("_");
  },
  convert_context_to_python_dict: function (context) {
    if (!context) return '';
    if (typeof context === "string") {
      context = context.split(".");
    }
    if (!Array.isArray(context)) {
      throw new Error("Invalid context format.");
    }
    const contextValue =  context.map((c, index) => {
      if (index === 0) return c;
      return `['${c}']`;
    }).join('')
    return contextValue;    
  }
};
