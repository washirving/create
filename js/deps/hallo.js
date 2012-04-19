
  /*
  Hallo - a rich text editing jQuery UI widget
  (c) 2011 Henri Bergius, IKS Consortium
  Hallo may be freely distributed under the MIT license
  */

  (function(jQuery) {
    return jQuery.widget("IKS.hallo", {
      toolbar: null,
      toolbarMoved: false,
      bound: false,
      originalContent: "",
      uuid: "",
      selection: null,
      options: {
        editable: true,
        plugins: {},
        floating: true,
        offset: {
          x: 0,
          y: 0
        },
        fixed: false,
        showAlways: false,
        activated: function() {},
        deactivated: function() {},
        selected: function() {},
        unselected: function() {},
        enabled: function() {},
        disabled: function() {},
        placeholder: '',
        parentElement: 'body',
        forceStructured: true,
        buttonCssClass: null
      },
      _create: function() {
        var options, plugin, _ref, _results;
        this.originalContent = this.getContents();
        this.id = this._generateUUID();
        this._prepareToolbar();
        _ref = this.options.plugins;
        _results = [];
        for (plugin in _ref) {
          options = _ref[plugin];
          if (!jQuery.isPlainObject(options)) options = {};
          options['editable'] = this;
          options['toolbar'] = this.toolbar;
          options['uuid'] = this.id;
          options['buttonCssClass'] = this.options.buttonCssClass;
          _results.push(jQuery(this.element)[plugin](options));
        }
        return _results;
      },
      _init: function() {
        this._setToolbarPosition();
        if (this.options.editable) {
          return this.enable();
        } else {
          return this.disable();
        }
      },
      disable: function() {
        this.element.attr("contentEditable", false);
        this.element.unbind("focus", this._activated);
        this.element.unbind("blur", this._deactivated);
        this.element.unbind("keyup paste change", this._checkModified);
        this.element.unbind("keyup", this._keys);
        this.element.unbind("keyup mouseup", this._checkSelection);
        this.bound = false;
        return this._trigger("disabled", null);
      },
      enable: function() {
        var widget;
        this.element.attr("contentEditable", true);
        if (!this.element.html()) this.element.html(this.options.placeholder);
        if (!this.bound) {
          this.element.bind("focus", this, this._activated);
          this.element.bind("blur", this, this._deactivated);
          this.element.bind("keyup paste change", this, this._checkModified);
          this.element.bind("keyup", this, this._keys);
          this.element.bind("keyup mouseup", this, this._checkSelection);
          widget = this;
          this.bound = true;
        }
        if (this.options.forceStructured) this._forceStructured();
        return this._trigger("enabled", null);
      },
      activate: function() {
        return this.element.focus();
      },
      getSelection: function() {
        var range, userSelection;
        if (jQuery.browser.msie) {
          range = document.selection.createRange();
        } else {
          if (window.getSelection) {
            userSelection = window.getSelection();
          } else if (document.selection) {
            userSelection = document.selection.createRange();
          } else {
            throw "Your browser does not support selection handling";
          }
          if (userSelection.rangeCount > 0) {
            range = userSelection.getRangeAt(0);
          } else {
            range = userSelection;
          }
        }
        return range;
      },
      restoreSelection: function(range) {
        if (jQuery.browser.msie) {
          return range.select();
        } else {
          window.getSelection().removeAllRanges();
          return window.getSelection().addRange(range);
        }
      },
      replaceSelection: function(cb) {
        var newTextNode, r, range, sel, t;
        if (jQuery.browser.msie) {
          t = document.selection.createRange().text;
          r = document.selection.createRange();
          return r.pasteHTML(cb(t));
        } else {
          sel = window.getSelection();
          range = sel.getRangeAt(0);
          newTextNode = document.createTextNode(cb(range.extractContents()));
          range.insertNode(newTextNode);
          range.setStartAfter(newTextNode);
          sel.removeAllRanges();
          return sel.addRange(range);
        }
      },
      removeAllSelections: function() {
        if (jQuery.browser.msie) {
          return range.empty();
        } else {
          return window.getSelection().removeAllRanges();
        }
      },
      getContents: function() {
        var contentClone, plugin;
        contentClone = this.element.clone();
        for (plugin in this.options.plugins) {
          jQuery(this.element)[plugin]('cleanupContentClone', contentClone);
        }
        return contentClone.html();
      },
      setContents: function(contents) {
        return this.element.html(contents);
      },
      isModified: function() {
        return this.originalContent !== this.getContents();
      },
      setUnmodified: function() {
        return this.originalContent = this.getContents();
      },
      setModified: function() {
        return this._trigger('modified', null, {
          editable: this,
          content: this.getContents()
        });
      },
      restoreOriginalContent: function() {
        return this.element.html(this.originalContent);
      },
      execute: function(command, value) {
        if (document.execCommand(command, false, value)) {
          return this.element.trigger("change");
        }
      },
      protectFocusFrom: function(el) {
        var widget;
        widget = this;
        return el.bind("mousedown", function(event) {
          event.preventDefault();
          widget._protectToolbarFocus = true;
          return setTimeout(function() {
            return widget._protectToolbarFocus = false;
          }, 300);
        });
      },
      _generateUUID: function() {
        var S4;
        S4 = function() {
          return ((1 + Math.random()) * 0x10000 | 0).toString(16).substring(1);
        };
        return "" + (S4()) + (S4()) + "-" + (S4()) + "-" + (S4()) + "-" + (S4()) + "-" + (S4()) + (S4()) + (S4());
      },
      _getToolbarPosition: function(event, selection) {
        var offset;
        if (!event) return;
        if (this.options.floating) {
          if (event.originalEvent instanceof KeyboardEvent) {
            return this._getCaretPosition(selection);
          } else if (event.originalEvent instanceof MouseEvent) {
            return {
              top: event.pageY,
              left: event.pageX
            };
          }
        } else {
          offset = parseFloat(this.element.css('outline-width')) + parseFloat(this.element.css('outline-offset'));
          return {
            top: this.element.offset().top - this.toolbar.outerHeight() - offset,
            left: this.element.offset().left - offset
          };
        }
      },
      _getCaretPosition: function(range) {
        var newRange, position, tmpSpan;
        tmpSpan = jQuery("<span/>");
        newRange = document.createRange();
        newRange.setStart(range.endContainer, range.endOffset);
        newRange.insertNode(tmpSpan.get(0));
        position = {
          top: tmpSpan.offset().top,
          left: tmpSpan.offset().left
        };
        tmpSpan.remove();
        return position;
      },
      _bindToolbarEventsFixed: function() {
        var _this = this;
        this.options.floating = false;
        this.element.bind("halloactivated", function(event, data) {
          _this._updateToolbarPosition(_this._getToolbarPosition(event));
          return _this.toolbar.show();
        });
        return this.element.bind("hallodeactivated", function(event, data) {
          return _this.toolbar.hide();
        });
      },
      _bindToolbarEventsRegular: function() {
        var _this = this;
        this.element.bind("halloselected", function(event, data) {
          var position;
          position = _this._getToolbarPosition(data.originalEvent, data.selection);
          if (!position) return;
          _this._updateToolbarPosition(position);
          return _this.toolbar.show();
        });
        this.element.bind("hallounselected", function(event, data) {
          return _this.toolbar.hide();
        });
        return this.element.bind("hallodeactivated", function(event, data) {
          return _this.toolbar.hide();
        });
      },
      _setToolbarPosition: function() {
        if (this.options.fixed) {
          this.toolbar.css('position', 'static');
          if (this.toolbarMoved) {
            jQuery(this.options.parentElement).append(this.toolbar);
          }
          this.toolbarMoved = false;
          return;
        }
        if (this.options.parentElement !== 'body') {
          jQuery('body').append(this.toolbar);
          this.toolbarMoved = true;
        }
        this.toolbar.css('position', 'absolute');
        this.toolbar.css('top', this.element.offset().top - 20);
        return this.toolbar.css('left', this.element.offset().left);
      },
      _prepareToolbar: function() {
        var widget;
        var _this = this;
        this.toolbar = jQuery('<div class="hallotoolbar"></div>').hide();
        this._setToolbarPosition();
        jQuery(this.options.parentElement).append(this.toolbar);
        widget = this;
        if (this.options.showAlways) this._bindToolbarEventsFixed();
        if (!this.options.showAlways) this._bindToolbarEventsRegular();
        jQuery(window).resize(function(event) {
          return _this._updateToolbarPosition(_this._getToolbarPosition(event));
        });
        return this.protectFocusFrom(this.toolbar);
      },
      _updateToolbarPosition: function(position) {
        if (this.options.fixed) return;
        if (!position) return;
        if (!(position.top && position.left)) return;
        this.toolbar.css("top", position.top);
        return this.toolbar.css("left", position.left);
      },
      _checkModified: function(event) {
        var widget;
        widget = event.data;
        if (widget.isModified()) return widget.setModified();
      },
      _keys: function(event) {
        var old, widget;
        widget = event.data;
        if (event.keyCode === 27) {
          old = widget.getContents();
          widget.restoreOriginalContent(event);
          widget._trigger("restored", null, {
            editable: widget,
            content: widget.getContents(),
            thrown: old
          });
          return widget.turnOff();
        }
      },
      _rangesEqual: function(r1, r2) {
        return r1.startContainer === r2.startContainer && r1.startOffset === r2.startOffset && r1.endContainer === r2.endContainer && r1.endOffset === r2.endOffset;
      },
      _checkSelection: function(event) {
        var widget;
        if (event.keyCode === 27) return;
        widget = event.data;
        return setTimeout(function() {
          var sel;
          sel = widget.getSelection();
          if (widget._isEmptySelection(sel) || widget._isEmptyRange(sel)) {
            if (widget.selection) {
              widget.selection = null;
              widget._trigger("unselected", null, {
                editable: widget,
                originalEvent: event
              });
            }
            return;
          }
          if (!widget.selection || !widget._rangesEqual(sel, widget.selection)) {
            widget.selection = sel.cloneRange();
            return widget._trigger("selected", null, {
              editable: widget,
              selection: widget.selection,
              ranges: [widget.selection],
              originalEvent: event
            });
          }
        }, 0);
      },
      _isEmptySelection: function(selection) {
        if (selection.type === "Caret") return true;
        return false;
      },
      _isEmptyRange: function(range) {
        if (range.collapsed) return true;
        if (range.isCollapsed) {
          if (typeof range.isCollapsed === 'function') return range.isCollapsed();
          return range.isCollapsed;
        }
        return false;
      },
      turnOn: function() {
        var el, widthToAdd;
        if (this.getContents() === this.options.placeholder) this.setContents('');
        jQuery(this.element).addClass('inEditMode');
        if (!this.options.floating) {
          el = jQuery(this.element);
          widthToAdd = parseFloat(el.css('padding-left'));
          widthToAdd += parseFloat(el.css('padding-right'));
          widthToAdd += parseFloat(el.css('border-left-width'));
          widthToAdd += parseFloat(el.css('border-right-width'));
          widthToAdd += (parseFloat(el.css('outline-width'))) * 2;
          widthToAdd += (parseFloat(el.css('outline-offset'))) * 2;
          jQuery(this.toolbar).css("width", el.width() + widthToAdd);
        } else {
          this.toolbar.css("width", "auto");
        }
        return this._trigger("activated", this);
      },
      turnOff: function() {
        jQuery(this.element).removeClass('inEditMode');
        this._trigger("deactivated", this);
        if (!this.getContents()) return this.setContents(this.options.placeholder);
      },
      _activated: function(event) {
        return event.data.turnOn();
      },
      _deactivated: function(event) {
        if (event.data._protectToolbarFocus !== true) {
          return event.data.turnOff();
        } else {
          return setTimeout(function() {
            return jQuery(event.data.element).focus();
          }, 300);
        }
      },
      _forceStructured: function(event) {
        try {
          return document.execCommand('styleWithCSS', 0, false);
        } catch (e) {
          try {
            return document.execCommand('useCSS', 0, true);
          } catch (e) {
            try {
              return document.execCommand('styleWithCSS', false, false);
            } catch (e) {

            }
          }
        }
      }
    });
  })(jQuery);

  (function(jQuery) {
    return jQuery.widget("IKS.hallolists", {
      options: {
        editable: null,
        toolbar: null,
        uuid: '',
        lists: {
          ordered: false,
          unordered: true
        },
        buttonCssClass: null
      },
      _create: function() {
        var buttonize, buttonset;
        var _this = this;
        buttonset = jQuery("<span class=\"" + this.widgetName + "\"></span>");
        buttonize = function(type, label) {
          var buttonElement;
          buttonElement = jQuery('<span></span>');
          buttonElement.hallobutton({
            uuid: _this.options.uuid,
            editable: _this.options.editable,
            label: label,
            command: "insert" + type + "List",
            icon: 'icon-list',
            cssClass: _this.options.buttonCssClass
          });
          return buttonset.append(buttonElement);
        };
        if (this.options.lists.ordered) buttonize("Ordered", "OL");
        if (this.options.lists.unordered) buttonize("Unordered", "UL");
        buttonset.buttonset();
        return this.options.toolbar.append(buttonset);
      },
      _init: function() {}
    });
  })(jQuery);

  (function(jQuery) {
    return jQuery.widget("IKS.halloheadings", {
      options: {
        editable: null,
        toolbar: null,
        uuid: "",
        headers: [1, 2, 3]
      },
      _create: function() {
        var button, buttonize, buttonset, header, id, label, widget, _i, _len, _ref;
        var _this = this;
        widget = this;
        buttonset = jQuery("<span class=\"" + widget.widgetName + "\"></span>");
        id = "" + this.options.uuid + "-paragraph";
        label = "P";
        buttonset.append(jQuery("<input id=\"" + id + "\" type=\"radio\" name=\"" + widget.options.uuid + "-headings\"/><label for=\"" + id + "\" class=\"p_button\">" + label + "</label>").button());
        button = jQuery("#" + id, buttonset);
        button.attr("hallo-command", "formatBlock");
        button.bind("change", function(event) {
          var cmd;
          cmd = jQuery(this).attr("hallo-command");
          return widget.options.editable.execute(cmd, "P");
        });
        buttonize = function(headerSize) {
          label = "H" + headerSize;
          id = "" + _this.options.uuid + "-" + headerSize;
          buttonset.append(jQuery("<input id=\"" + id + "\" type=\"radio\" name=\"" + widget.options.uuid + "-headings\"/><label for=\"" + id + "\" class=\"h" + headerSize + "_button\">" + label + "</label>").button());
          button = jQuery("#" + id, buttonset);
          button.attr("hallo-size", "H" + headerSize);
          return button.bind("change", function(event) {
            var size;
            size = jQuery(this).attr("hallo-size");
            return widget.options.editable.execute("formatBlock", size);
          });
        };
        _ref = this.options.headers;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          header = _ref[_i];
          buttonize(header);
        }
        buttonset.buttonset();
        this.element.bind("keyup paste change mouseup", function(event) {
          var format, formatNumber, labelParent, matches, selectedButton;
          try {
            format = document.queryCommandValue("formatBlock").toUpperCase();
          } catch (e) {
            format = '';
          }
          if (format === "P") {
            selectedButton = jQuery("#" + widget.options.uuid + "-paragraph");
          } else if (matches = format.match(/\d/)) {
            formatNumber = matches[0];
            selectedButton = jQuery("#" + widget.options.uuid + "-" + formatNumber);
          }
          labelParent = jQuery(buttonset);
          labelParent.children("input").attr("checked", false);
          labelParent.children("label").removeClass("ui-state-clicked");
          labelParent.children("input").button("widget").button("refresh");
          if (selectedButton) {
            selectedButton.attr("checked", true);
            selectedButton.next("label").addClass("ui-state-clicked");
            return selectedButton.button("refresh");
          }
        });
        return this.options.toolbar.append(buttonset);
      },
      _init: function() {}
    });
  })(jQuery);

  (function(jQuery) {
    return jQuery.widget("Liip.hallooverlay", {
      options: {
        editable: null,
        toolbar: null,
        uuid: "",
        overlay: null,
        padding: 10,
        background: null
      },
      _create: function() {
        var widget;
        widget = this;
        if (!this.options.bound) {
          this.options.bound = true;
          widget.options.editable.element.bind("halloactivated", function(event, data) {
            widget.options.currentEditable = jQuery(event.target);
            if (!widget.options.visible) return widget.showOverlay();
          });
          widget.options.editable.element.bind("hallomodified", function(event, data) {
            widget.options.currentEditable = jQuery(event.target);
            if (widget.options.visible) return widget.resizeOverlay();
          });
          return widget.options.editable.element.bind("hallodeactivated", function(event, data) {
            widget.options.currentEditable = jQuery(event.target);
            if (widget.options.visible) return widget.hideOverlay();
          });
        }
      },
      _init: function() {},
      showOverlay: function() {
        this.options.visible = true;
        if (this.options.overlay === null) {
          if (jQuery("#halloOverlay").length > 0) {
            this.options.overlay = jQuery("#halloOverlay");
          } else {
            this.options.overlay = jQuery('<div id="halloOverlay" class="halloOverlay">');
            jQuery(document.body).append(this.options.overlay);
          }
          this.options.overlay.bind('click', jQuery.proxy(this.options.editable.turnOff, this.options.editable));
        }
        this.options.overlay.show();
        if (this.options.background === null) {
          if (jQuery("#halloBackground").length > 0) {
            this.options.background = jQuery("#halloBackground");
          } else {
            this.options.background = jQuery('<div id="halloBackground" class="halloBackground">');
            jQuery(document.body).append(this.options.background);
          }
        }
        this.resizeOverlay();
        this.options.background.show();
        if (!this.options.originalZIndex) {
          this.options.originalZIndex = this.options.currentEditable.css("z-index");
        }
        return this.options.currentEditable.css('z-index', '350');
      },
      resizeOverlay: function() {
        var offset;
        offset = this.options.currentEditable.offset();
        this.options.background.css({
          top: offset.top - this.options.padding,
          left: offset.left - this.options.padding
        });
        this.options.background.width(this.options.currentEditable.width() + 2 * this.options.padding);
        return this.options.background.height(this.options.currentEditable.height() + 2 * this.options.padding);
      },
      hideOverlay: function() {
        this.options.visible = false;
        this.options.overlay.hide();
        this.options.background.hide();
        return this.options.currentEditable.css('z-index', this.options.originalZIndex);
      },
      _findBackgroundColor: function(jQueryfield) {
        var color;
        color = jQueryfield.css("background-color");
        if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
        if (jQueryfield.is("body")) {
          return "white";
        } else {
          return this._findBackgroundColor(jQueryfield.parent());
        }
      }
    });
  })(jQuery);

  (function(jQuery) {
    return jQuery.widget("Liip.hallotoolbarlinebreak", {
      options: {
        editable: null,
        toolbar: null,
        uuid: "",
        breakAfter: []
      },
      _create: function() {
        var buttonset, buttonsets, queuedButtonsets, row, rowcounter, _i, _j, _len, _len2, _ref;
        buttonsets = jQuery('.ui-buttonset', this.options.toolbar);
        queuedButtonsets = jQuery();
        rowcounter = 0;
        _ref = this.options.breakAfter;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          row = _ref[_i];
          rowcounter++;
          for (_j = 0, _len2 = buttonsets.length; _j < _len2; _j++) {
            buttonset = buttonsets[_j];
            queuedButtonsets = jQuery(queuedButtonsets).add(jQuery(buttonset));
            if (jQuery(buttonset).hasClass(row)) {
              queuedButtonsets.wrapAll('<div class="halloButtonrow halloButtonrow-' + rowcounter + '" />');
              buttonsets = buttonsets.not(queuedButtonsets);
              queuedButtonsets = jQuery();
              break;
            }
          }
        }
        if (buttonsets.length > 0) {
          rowcounter++;
          return buttonsets.wrapAll('<div class="halloButtonrow halloButtonrow-' + rowcounter + '" />');
        }
      },
      _init: function() {}
    });
  })(jQuery);

  (function(jQuery) {
    var z;
    z = null;
    if (this.VIE !== void 0) {
      z = new VIE;
      z.use(new z.StanbolService({
        proxyDisabled: true,
        url: 'http://dev.iks-project.eu:8081'
      }));
    }
    return jQuery.widget('IKS.halloannotate', {
      options: {
        vie: z,
        editable: null,
        toolbar: null,
        uuid: '',
        select: function() {},
        decline: function() {},
        remove: function() {},
        buttonCssClass: null
      },
      _create: function() {
        var buttonHolder, editableElement, turnOffAnnotate, widget;
        var _this = this;
        widget = this;
        if (this.options.vie === void 0) {
          throw 'The halloannotate plugin requires VIE to be loaded';
          return;
        }
        if (typeof this.element.annotate !== 'function') {
          throw 'The halloannotate plugin requires annotate.js to be loaded';
          return;
        }
        this.state = 'off';
        buttonHolder = jQuery("<span class=\"" + widget.widgetName + "\"></span>");
        this.button = buttonHolder.hallobutton({
          label: 'Annotate',
          icon: 'icon-tags',
          editable: this.options.editable,
          command: null,
          uuid: this.options.uuid,
          cssClass: this.options.buttonCssClass,
          queryState: false
        });
        buttonHolder.bind('change', function(event) {
          if (_this.state === "pending") return;
          if (_this.state === "off") return _this.turnOn();
          return _this.turnOff();
        });
        buttonHolder.buttonset();
        this.options.toolbar.append(this.button);
        this.instantiate();
        turnOffAnnotate = function() {
          var editable;
          editable = this;
          return jQuery(editable).halloannotate('turnOff');
        };
        editableElement = this.options.editable.element;
        return editableElement.bind('hallodisabled', turnOffAnnotate);
      },
      cleanupContentClone: function(el) {
        if (this.state === 'on') {
          return el.find(".entity:not([about])").each(function() {
            return jQuery(this).replaceWith(jQuery(this).html());
          });
        }
      },
      instantiate: function() {
        var widget;
        widget = this;
        return this.options.editable.element.annotate({
          vie: this.options.vie,
          debug: false,
          showTooltip: true,
          select: this.options.select,
          remove: this.options.remove,
          success: this.options.success,
          error: this.options.error
        }).bind('annotateselect', function() {
          return widget.options.editable.setModified();
        }).bind('annotateremove', function() {
          return jQuery.noop();
        });
      },
      turnPending: function() {
        this.state = 'pending';
        this.button.hallobutton('checked', false);
        return this.button.hallobutton('disable');
      },
      turnOn: function() {
        var widget;
        var _this = this;
        this.turnPending();
        widget = this;
        try {
          return this.options.editable.element.annotate('enable', function(success) {
            if (success) {
              _this.state = 'on';
              _this.button.hallobutton('checked', true);
              return _this.button.hallobutton('enable');
            }
          });
        } catch (e) {
          return alert(e);
        }
      },
      turnOff: function() {
        this.options.editable.element.annotate('disable');
        this.button.attr('checked', false);
        this.button.find("label").removeClass("ui-state-clicked");
        this.button.button('refresh');
        return this.state = 'off';
      }
    });
  })(jQuery);

  (function(jQuery) {
    return jQuery.widget("Liip.halloimage", {
      options: {
        editable: null,
        toolbar: null,
        uuid: "",
        limit: 8,
        search: null,
        suggestions: null,
        loaded: null,
        upload: null,
        uploadUrl: null,
        dialogOpts: {
          autoOpen: false,
          width: 270,
          height: "auto",
          title: "Insert Images",
          modal: false,
          resizable: false,
          draggable: true,
          dialogClass: 'halloimage-dialog',
          close: function(ev, ui) {
            return jQuery('.image_button').removeClass('ui-state-clicked');
          }
        },
        dialog: null,
        buttonCssClass: null
      },
      _create: function() {
        var button, buttonHolder, buttonset, dialogId, id, widget;
        widget = this;
        dialogId = "" + this.options.uuid + "-image-dialog";
        this.options.dialog = jQuery("<div id=\"" + dialogId + "\">                <div class=\"nav\">                    <ul class=\"tabs\">                    </ul>                    <div id=\"" + this.options.uuid + "-tab-activeIndicator\" class=\"tab-activeIndicator\" />                </div>                <div class=\"dialogcontent\">            </div>");
        if (widget.options.uploadUrl && !widget.options.upload) {
          widget.options.upload = widget._iframeUpload;
        }
        if (widget.options.suggestions) {
          this._addGuiTabSuggestions(jQuery(".tabs", this.options.dialog), jQuery(".dialogcontent", this.options.dialog));
        }
        if (widget.options.search) {
          this._addGuiTabSearch(jQuery(".tabs", this.options.dialog), jQuery(".dialogcontent", this.options.dialog));
        }
        if (widget.options.upload) {
          this._addGuiTabUpload(jQuery(".tabs", this.options.dialog), jQuery(".dialogcontent", this.options.dialog));
        }
        buttonset = jQuery("<span class=\"" + widget.widgetName + "\"></span>");
        id = "" + this.options.uuid + "-image";
        buttonHolder = jQuery('<span></span>');
        buttonHolder.hallobutton({
          label: 'Images',
          icon: 'icon-picture',
          editable: this.options.editable,
          command: null,
          queryState: false,
          uuid: this.options.uuid,
          cssClass: this.options.buttonCssClass
        });
        buttonset.append(buttonHolder);
        button = buttonHolder;
        button.bind("change", function(event) {
          if (widget.options.dialog.dialog("isOpen")) {
            return widget._closeDialog();
          } else {
            return widget._openDialog();
          }
        });
        this.options.editable.element.bind("hallodeactivated", function(event) {
          return widget._closeDialog();
        });
        jQuery(this.options.editable.element).delegate("img", "click", function(event) {
          return widget._openDialog();
        });
        jQuery(this.options.dialog).find(".nav li").click(function() {
          jQuery("." + widget.widgetName + "-tab").each(function() {
            return jQuery(this).hide();
          });
          id = jQuery(this).attr("id");
          jQuery("#" + id + "-content").show();
          return jQuery("#" + widget.options.uuid + "-tab-activeIndicator").css("margin-left", jQuery(this).position().left + (jQuery(this).width() / 2));
        });
        jQuery("." + widget.widgetName + "-tab .imageThumbnail").live("click", function(event) {
          var scope;
          scope = jQuery(this).closest("." + widget.widgetName + "-tab");
          jQuery(".imageThumbnail", scope).removeClass("imageThumbnailActive");
          jQuery(this).addClass("imageThumbnailActive");
          jQuery(".activeImage", scope).attr("src", jQuery(this).attr("src"));
          return jQuery(".activeImageBg", scope).attr("src", jQuery(this).attr("src"));
        });
        buttonset.buttonset();
        this.options.toolbar.append(buttonset);
        this.options.dialog.dialog(this.options.dialogOpts);
        return this._addDragnDrop();
      },
      _init: function() {},
      _openDialog: function() {
        var articleTags, cleanUp, i, repoImagesFound, showResults, tagType, thumbId, tmpArticleTags, vie, widget, xposition, yposition;
        widget = this;
        cleanUp = function() {
          return window.setTimeout((function() {
            var thumbnails;
            thumbnails = jQuery(".imageThumbnail");
            return jQuery(thumbnails).each(function() {
              var size;
              size = jQuery("#" + this.id).width();
              if (size <= 20) return jQuery("#" + this.id).parent("li").remove();
            });
          }), 15000);
        };
        repoImagesFound = false;
        showResults = function(response) {
          jQuery.each(response.assets, function(key, val) {
            jQuery(".imageThumbnailContainer ul").append("<li><img src=\"" + val.url + "\" class=\"imageThumbnail\"></li>");
            return repoImagesFound = true;
          });
          if (response.assets.length > 0) return jQuery("#activitySpinner").hide();
        };
        jQuery('.image_button').addClass('ui-state-clicked');
        jQuery("#" + this.options.uuid + "-sugg-activeImage").attr("src", jQuery("#" + this.options.uuid + "-tab-suggestions-content .imageThumbnailActive").first().attr("src"));
        jQuery("#" + this.options.uuid + "-sugg-activeImageBg").attr("src", jQuery("#" + this.options.uuid + "-tab-suggestions-content .imageThumbnailActive").first().attr("src"));
        this.lastSelection = this.options.editable.getSelection();
        xposition = jQuery(this.options.editable.element).offset().left + jQuery(this.options.editable.element).outerWidth() - 3;
        yposition = jQuery(this.options.toolbar).offset().top - jQuery(document).scrollTop() - 29;
        this.options.dialog.dialog("option", "position", [xposition, yposition]);
        if (widget.options.loaded === null && widget.options.suggestions) {
          articleTags = [];
          jQuery("#activitySpinner").show();
          tmpArticleTags = jQuery(".inEditMode").parent().find(".articleTags input").val();
          tmpArticleTags = tmpArticleTags.split(",");
          for (i in tmpArticleTags) {
            tagType = typeof tmpArticleTags[i];
            if ("string" === tagType && tmpArticleTags[i].indexOf("http") !== -1) {
              articleTags.push(tmpArticleTags[i]);
            }
          }
          jQuery(".imageThumbnailContainer ul").empty();
          widget.options.suggestions(jQuery(".inEditMode").parent().find(".articleTags input").val(), widget.options.limit, 0, showResults);
          vie = new VIE();
          vie.use(new vie.DBPediaService({
            url: "http://dev.iks-project.eu/stanbolfull",
            proxyDisabled: true
          }));
          thumbId = 1;
          if (articleTags.length === 0) {
            jQuery("#activitySpinner").html("No images found.");
          }
          jQuery(articleTags).each(function() {
            return vie.load({
              entity: this + ""
            }).using("dbpedia").execute().done(function(entity) {
              jQuery(entity).each(function() {
                var img, responseType;
                if (this.attributes["<http://dbpedia.org/ontology/thumbnail>"]) {
                  responseType = typeof this.attributes["<http://dbpedia.org/ontology/thumbnail>"];
                  if (responseType === "string") {
                    img = this.attributes["<http://dbpedia.org/ontology/thumbnail>"];
                    img = img.substring(1, img.length - 1);
                  }
                  if (responseType === "object") {
                    img = "";
                    img = this.attributes["<http://dbpedia.org/ontology/thumbnail>"][0].value;
                  }
                  jQuery(".imageThumbnailContainer ul").append("<li><img id=\"si-" + thumbId + "\" src=\"" + img + "\" class=\"imageThumbnail\"></li>");
                  return thumbId++;
                }
              });
              return jQuery("#activitySpinner").hide();
            });
          });
        }
        cleanUp();
        widget.options.loaded = 1;
        this.options.dialog.dialog("open");
        return this.options.editable.protectFocusFrom(this.options.dialog);
      },
      _closeDialog: function() {
        return this.options.dialog.dialog("close");
      },
      _addGuiTabSuggestions: function(tabs, element) {
        var widget;
        widget = this;
        tabs.append(jQuery("<li id=\"" + this.options.uuid + "-tab-suggestions\" class=\"" + widget.widgetName + "-tabselector " + widget.widgetName + "-tab-suggestions\"><span>Suggestions</span></li>"));
        return element.append(jQuery("<div id=\"" + this.options.uuid + "-tab-suggestions-content\" class=\"" + widget.widgetName + "-tab tab-suggestions\">                <div class=\"imageThumbnailContainer fixed\"><div id=\"activitySpinner\">Loading Images...</div><ul><li>                    <img src=\"http://imagesus.homeaway.com/mda01/badf2e69babf2f6a0e4b680fc373c041c705b891\" class=\"imageThumbnail imageThumbnailActive\" />                  </li></ul><br style=\"clear:both\"/>                </div>                <div class=\"activeImageContainer\">                    <div class=\"rotationWrapper\">                        <div class=\"hintArrow\"></div>                        <img src=\"\" id=\"" + this.options.uuid + "-sugg-activeImage\" class=\"activeImage\" />                    </div>                    <img src=\"\" id=\"" + this.options.uuid + "-sugg-activeImageBg\" class=\"activeImage activeImageBg\" />                </div>                <div class=\"metadata\">                    <label for=\"caption-sugg\">Caption</label><input type=\"text\" id=\"caption-sugg\" />                </div>            </div>"));
      },
      _addGuiTabSearch: function(tabs, element) {
        var dialogId, widget;
        widget = this;
        dialogId = "" + this.options.uuid + "-image-dialog";
        tabs.append(jQuery("<li id=\"" + this.options.uuid + "-tab-search\" class=\"" + widget.widgetName + "-tabselector " + widget.widgetName + "-tab-search\"><span>Search</span></li>"));
        element.append(jQuery("<div id=\"" + this.options.uuid + "-tab-search-content\" class=\"" + widget.widgetName + "-tab tab-search\">                <form type=\"get\" id=\"" + this.options.uuid + "-" + widget.widgetName + "-searchForm\">                    <input type=\"text\" class=\"searchInput\" /><input type=\"submit\" id=\"" + this.options.uuid + "-" + widget.widgetName + "-searchButton\" class=\"button searchButton\" value=\"OK\"/>                </form>                <div class=\"searchResults imageThumbnailContainer\"></div>                <div id=\"" + this.options.uuid + "-search-activeImageContainer\" class=\"search-activeImageContainer activeImageContainer\">                    <div class=\"rotationWrapper\">                        <div class=\"hintArrow\"></div>                        <img src=\"\" id=\"" + this.options.uuid + "-search-activeImageBg\" class=\"activeImage\" />                    </div>                    <img src=\"\" id=\"" + this.options.uuid + "-search-activeImage\" class=\"activeImage activeImageBg\" />                </div>                <div class=\"metadata\" id=\"metadata-search\" style=\"display: none;\">                    <label for=\"caption-search\">Caption</label><input type=\"text\" id=\"caption-search\" />                    <!--<button id=\"" + this.options.uuid + "-" + widget.widgetName + "-addimage\">Add Image</button>-->                </div>            </div>"));
        return jQuery(".tab-search form", element).submit(function(event) {
          var showResults, that;
          event.preventDefault();
          that = this;
          showResults = function(response) {
            var container, firstimage, items;
            items = [];
            items.push("<div class=\"pager-prev\" style=\"display:none\"></div>");
            jQuery.each(response.assets, function(key, val) {
              return items.push("<img src=\"" + val.url + "\" class=\"imageThumbnail " + widget.widgetName + "-search-imageThumbnail\" /> ");
            });
            items.push("<div class=\"pager-next\" style=\"display:none\"></div>");
            container = jQuery("#" + dialogId + " .tab-search .searchResults");
            container.html(items.join(""));
            if (response.offset > 0) jQuery('.pager-prev', container).show();
            if (response.offset < response.total) {
              jQuery('.pager-next', container).show();
            }
            jQuery('.pager-prev', container).click(function(event) {
              return widget.options.search(null, widget.options.limit, response.offset - widget.options.limit, showResults);
            });
            jQuery('.pager-next', container).click(function(event) {
              return widget.options.search(null, widget.options.limit, response.offset + widget.options.limit, showResults);
            });
            jQuery("#" + widget.options.uuid + "-search-activeImageContainer").show();
            firstimage = jQuery("." + widget.widgetName + "-search-imageThumbnail").first().addClass("imageThumbnailActive");
            jQuery("#" + widget.options.uuid + "-search-activeImage, #" + widget.options.uuid + "-search-activeImageBg").attr("src", firstimage.attr("src"));
            return jQuery("#metadata-search").show();
          };
          return widget.options.search(null, widget.options.limit, 0, showResults);
        });
      },
      _prepareIframe: function(widget) {
        var iframe;
        widget.options.iframeName = "" + widget.options.uuid + "-" + widget.widgetName + "-postframe";
        iframe = jQuery("<iframe name=\"" + widget.options.iframeName + "\" id=\"" + widget.options.iframeName + "\" class=\"hidden\" src=\"javascript:false;\" style=\"display:none\" />");
        jQuery("#" + widget.options.uuid + "-" + widget.widgetName + "-iframe").append(iframe);
        return iframe.get(0).name = widget.options.iframeName;
      },
      _iframeUpload: function(data) {
        var uploadForm, widget;
        widget = data.widget;
        widget._prepareIframe(widget);
        jQuery("#" + widget.options.uuid + "-" + widget.widgetName + "-tags").val(jQuery(".inEditMode").parent().find(".articleTags input").val());
        uploadForm = jQuery("#" + widget.options.uuid + "-" + widget.widgetName + "-uploadform");
        uploadForm.attr("action", widget.options.uploadUrl);
        uploadForm.attr("method", "post");
        uploadForm.attr("userfile", data.file);
        uploadForm.attr("enctype", "multipart/form-data");
        uploadForm.attr("encoding", "multipart/form-data");
        uploadForm.attr("target", widget.options.iframeName);
        uploadForm.submit();
        return jQuery("#" + widget.options.iframeName).load(function() {
          return data.success(jQuery("#" + widget.options.iframeName)[0].contentWindow.location.href);
        });
      },
      _addGuiTabUpload: function(tabs, element) {
        var iframe, insertImage, widget;
        widget = this;
        tabs.append(jQuery("<li id=\"" + this.options.uuid + "-tab-upload\" class=\"" + widget.widgetName + "-tabselector " + widget.widgetName + "-tab-upload\"><span>Upload</span></li>"));
        element.append(jQuery("<div id=\"" + this.options.uuid + "-tab-upload-content\" class=\"" + widget.widgetName + "-tab tab-upload\">                <form id=\"" + this.options.uuid + "-" + widget.widgetName + "-uploadform\">                    <input id=\"" + this.options.uuid + "-" + widget.widgetName + "-file\" name=\"" + this.options.uuid + "-" + widget.widgetName + "-file\" type=\"file\" class=\"file\" accept=\"image/*\">                    <input id=\"" + this.options.uuid + "-" + widget.widgetName + "-tags\" name=\"tags\" type=\"hidden\" />                    <br />                    <input type=\"submit\" value=\"Upload\" id=\"" + this.options.uuid + "-" + widget.widgetName + "-upload\">                </form>                <div id=\"" + this.options.uuid + "-" + widget.widgetName + "-iframe\"></div>            </div>"));
        iframe = jQuery("<iframe name=\"postframe\" id=\"postframe\" class=\"hidden\" src=\"about:none\" style=\"display:none\" />");
        jQuery("#" + widget.options.uuid + "-" + widget.widgetName + "-upload").live("click", function(e) {
          var userFile;
          e.preventDefault();
          userFile = jQuery("#" + widget.options.uuid + "-" + widget.widgetName + "-file").val();
          widget.options.upload({
            widget: widget,
            file: userFile,
            success: function(imageUrl) {
              var imageID, list;
              imageID = "si" + Math.floor(Math.random() * (400 - 300 + 1) + 400) + "ab";
              if (jQuery(".imageThumbnailContainer ul", widget.options.dialog).length === 0) {
                list = jQuery('<ul></ul>');
                jQuery('.imageThumbnailContainer').append(list);
              }
              jQuery(".imageThumbnailContainer ul", widget.options.dialog).append("<li><img src=\"" + imageUrl + "\" id=\"" + imageID + "\" class=\"imageThumbnail\"></li>");
              jQuery("#" + imageID).trigger("click");
              return jQuery(widget.options.dialog).find(".nav li").first().trigger("click");
            }
          });
          return false;
        });
        insertImage = function() {
          var img, triggerModified;
          try {
            if (!widget.options.editable.getSelection()) {
              throw new Error("SelectionNotSet");
            }
          } catch (error) {
            widget.options.editable.restoreSelection(widget.lastSelection);
          }
          document.execCommand("insertImage", null, jQuery(this).attr('src'));
          img = document.getSelection().anchorNode.firstChild;
          jQuery(img).attr("alt", jQuery(".caption").value);
          triggerModified = function() {
            return widget.element.trigger("hallomodified");
          };
          window.setTimeout(triggerModified, 100);
          return widget._closeDialog();
        };
        return this.options.dialog.find(".halloimage-activeImage, #" + widget.options.uuid + "-" + widget.widgetName + "-addimage").click(insertImage);
      },
      _addDragnDrop: function() {
        var dnd, draggables, editable, helper, offset, overlay, overlayMiddleConfig, third, widgetOptions;
        helper = {
          delayAction: function(functionToCall, delay) {
            var timer;
            timer = clearTimeout(timer);
            if (!timer) return timer = setTimeout(functionToCall, delay);
          },
          calcPosition: function(offset, event) {
            var position;
            position = offset.left + third;
            if (event.pageX >= position && event.pageX <= (offset.left + third * 2)) {
              return "middle";
            } else if (event.pageX < position) {
              return "left";
            } else if (event.pageX > (offset.left + third * 2)) {
              return "right";
            }
          },
          createInsertElement: function(image, tmp) {
            var altText, height, imageInsert, maxHeight, maxWidth, ratio, tmpImg, width;
            maxWidth = 250;
            maxHeight = 250;
            tmpImg = new Image();
            tmpImg.src = image.src;
            if (!tmp) {
              if (this.startPlace.parents(".tab-suggestions").length > 0) {
                altText = jQuery("#caption-sugg").val();
              } else if (this.startPlace.parents(".tab-search").length > 0) {
                altText = jQuery("#caption-search").val();
              } else {
                altText = jQuery(image).attr("alt");
              }
            }
            width = tmpImg.width;
            height = tmpImg.height;
            if (width > maxWidth || height > maxHeight) {
              if (width > height) {
                ratio = (tmpImg.width / maxWidth).toFixed();
              } else {
                ratio = (tmpImg.height / maxHeight).toFixed();
              }
              width = (tmpImg.width / ratio).toFixed();
              height = (tmpImg.height / ratio).toFixed();
            }
            imageInsert = jQuery("<img>").attr({
              src: tmpImg.src,
              width: width,
              height: height,
              alt: altText,
              "class": (tmp ? "tmp" : "")
            }).show();
            return imageInsert;
          },
          createLineFeedbackElement: function() {
            return jQuery("<div/>").addClass("tmpLine");
          },
          removeFeedbackElements: function() {
            return jQuery('.tmp, .tmpLine', editable).remove();
          },
          removeCustomHelper: function() {
            return jQuery(".customHelper").remove();
          },
          showOverlay: function(position) {
            var eHeight;
            eHeight = editable.height() + parseFloat(editable.css('paddingTop')) + parseFloat(editable.css('paddingBottom'));
            overlay.big.css({
              height: eHeight
            });
            overlay.left.css({
              height: eHeight
            });
            overlay.right.css({
              height: eHeight
            });
            switch (position) {
              case "left":
                overlay.big.addClass("bigOverlayLeft").removeClass("bigOverlayRight").css({
                  left: third
                }).show();
                overlay.left.hide();
                return overlay.right.hide();
              case "middle":
                overlay.big.removeClass("bigOverlayLeft bigOverlayRight");
                overlay.big.hide();
                overlay.left.show();
                return overlay.right.show();
              case "right":
                overlay.big.addClass("bigOverlayRight").removeClass("bigOverlayLeft").css({
                  left: 0
                }).show();
                overlay.left.hide();
                return overlay.right.hide();
            }
          },
          checkOrigin: function(event) {
            if (jQuery(event.target).parents("[contenteditable]").length !== 0) {
              return true;
            } else {
              return false;
            }
          },
          startPlace: ""
        };
        dnd = {
          createTmpFeedback: function(image, position) {
            var el;
            if (position === 'middle') {
              return helper.createLineFeedbackElement();
            } else {
              el = helper.createInsertElement(image, true);
              return el.addClass("inlineImage-" + position);
            }
          },
          handleOverEvent: function(event, ui) {
            var postPone;
            postPone = function() {
              var position;
              window.waitWithTrash = clearTimeout(window.waitWithTrash);
              position = helper.calcPosition(offset, event);
              jQuery('.trashcan', ui.helper).remove();
              editable.append(overlay.big);
              editable.append(overlay.left);
              editable.append(overlay.right);
              helper.removeFeedbackElements();
              jQuery(event.target).prepend(dnd.createTmpFeedback(ui.draggable[0], position));
              if (position === "middle") {
                jQuery(event.target).prepend(dnd.createTmpFeedback(ui.draggable[0], 'right'));
                jQuery('.tmp', jQuery(event.target)).hide();
              } else {
                jQuery(event.target).prepend(dnd.createTmpFeedback(ui.draggable[0], 'middle'));
                jQuery('.tmpLine', jQuery(event.target)).hide();
              }
              return helper.showOverlay(position);
            };
            return setTimeout(postPone, 5);
          },
          handleDragEvent: function(event, ui) {
            var position, tmpFeedbackLR, tmpFeedbackMiddle;
            position = helper.calcPosition(offset, event);
            if (position === dnd.lastPositionDrag) return;
            dnd.lastPositionDrag = position;
            tmpFeedbackLR = jQuery('.tmp', editable);
            tmpFeedbackMiddle = jQuery('.tmpLine', editable);
            if (position === "middle") {
              tmpFeedbackMiddle.show();
              tmpFeedbackLR.hide();
            } else {
              tmpFeedbackMiddle.hide();
              tmpFeedbackLR.removeClass("inlineImage-left inlineImage-right").addClass("inlineImage-" + position).show();
            }
            return helper.showOverlay(position);
          },
          handleLeaveEvent: function(event, ui) {
            var func;
            func = function() {
              if (!jQuery('div.trashcan', ui.helper).length) {
                jQuery(ui.helper).append(jQuery('<div class="trashcan"></div>'));
              }
              return jQuery('.bigOverlay, .smallOverlay').remove();
            };
            window.waitWithTrash = setTimeout(func, 200);
            return helper.removeFeedbackElements();
          },
          handleStartEvent: function(event, ui) {
            var internalDrop;
            internalDrop = helper.checkOrigin(event);
            if (internalDrop) jQuery(event.target).remove();
            jQuery(document).trigger('startPreventSave');
            return helper.startPlace = jQuery(event.target);
          },
          handleStopEvent: function(event, ui) {
            var internalDrop;
            internalDrop = helper.checkOrigin(event);
            if (internalDrop) {
              jQuery(event.target).remove();
            } else {
              editable.trigger('change');
            }
            overlay.big.hide();
            overlay.left.hide();
            overlay.right.hide();
            return jQuery(document).trigger('stopPreventSave');
          },
          handleDropEvent: function(event, ui) {
            var imageInsert, internalDrop, position;
            internalDrop = helper.checkOrigin(event);
            position = helper.calcPosition(offset, event);
            helper.removeFeedbackElements();
            helper.removeCustomHelper();
            imageInsert = helper.createInsertElement(ui.draggable[0], false);
            if (position === "middle") {
              imageInsert.show();
              imageInsert.removeClass("inlineImage-middle inlineImage-left inlineImage-right").addClass("inlineImage-" + position).css({
                position: "relative",
                left: ((editable.width() + parseFloat(editable.css('paddingLeft')) + parseFloat(editable.css('paddingRight'))) - imageInsert.attr('width')) / 2
              });
              imageInsert.insertBefore(jQuery(event.target));
            } else {
              imageInsert.removeClass("inlineImage-middle inlineImage-left inlineImage-right").addClass("inlineImage-" + position).css("display", "block");
              jQuery(event.target).prepend(imageInsert);
            }
            overlay.big.hide();
            overlay.left.hide();
            overlay.right.hide();
            editable.trigger('change');
            return dnd.init(editable);
          },
          createHelper: function(event) {
            return jQuery('<div>').css({
              backgroundImage: "url(" + jQuery(event.currentTarget).attr('src') + ")"
            }).addClass('customHelper').appendTo('body');
          },
          init: function() {
            var draggable, initDraggable;
            draggable = [];
            initDraggable = function(elem) {
              if (!elem.jquery_draggable_initialized) {
                elem.jquery_draggable_initialized = true;
                jQuery(elem).draggable({
                  cursor: "move",
                  helper: dnd.createHelper,
                  drag: dnd.handleDragEvent,
                  start: dnd.handleStartEvent,
                  stop: dnd.handleStopEvent,
                  disabled: !editable.hasClass('inEditMode'),
                  cursorAt: {
                    top: 50,
                    left: 50
                  }
                });
              }
              return draggables.push(elem);
            };
            jQuery(".rotationWrapper img", widgetOptions.dialog).each(function(index, elem) {
              if (!elem.jquery_draggable_initialized) return initDraggable(elem);
            });
            jQuery('img', editable).each(function(index, elem) {
              elem.contentEditable = false;
              if (!elem.jquery_draggable_initialized) return initDraggable(elem);
            });
            return jQuery('p', editable).each(function(index, elem) {
              if (jQuery(elem).data('jquery_droppable_initialized')) return;
              jQuery(elem).droppable({
                tolerance: "pointer",
                drop: dnd.handleDropEvent,
                over: dnd.handleOverEvent,
                out: dnd.handleLeaveEvent
              });
              return jQuery(elem).data('jquery_droppable_initialized', true);
            });
          },
          enableDragging: function() {
            return jQuery.each(draggables, function(index, d) {
              return jQuery(d).draggable('option', 'disabled', false);
            });
          },
          disableDragging: function() {
            return jQuery.each(draggables, function(index, d) {
              return jQuery(d).draggable('option', 'disabled', true);
            });
          }
        };
        draggables = [];
        editable = jQuery(this.options.editable.element);
        widgetOptions = this.options;
        offset = editable.offset();
        third = parseFloat(editable.width() / 3);
        overlayMiddleConfig = {
          width: third,
          height: editable.height()
        };
        overlay = {
          big: jQuery("<div/>").addClass("bigOverlay").css({
            width: third * 2,
            height: editable.height()
          }),
          left: jQuery("<div/>").addClass("smallOverlay smallOverlayLeft").css(overlayMiddleConfig),
          right: jQuery("<div/>").addClass("smallOverlay smallOverlayRight").css(overlayMiddleConfig).css("left", third * 2)
        };
        dnd.init();
        editable.bind('halloactivated', dnd.enableDragging);
        return editable.bind('hallodeactivated', dnd.disableDragging);
      }
    });
  })(jQuery);

  (function(jQuery) {
    return jQuery.widget("IKS.halloformat", {
      options: {
        editable: null,
        toolbar: null,
        uuid: "",
        formattings: {
          bold: true,
          italic: true,
          strikeThrough: false,
          underline: false
        },
        buttonCssClass: null
      },
      _create: function() {
        var buttonize, buttonset, enabled, format, widget, _ref;
        var _this = this;
        widget = this;
        buttonset = jQuery("<span class=\"" + widget.widgetName + "\"></span>");
        buttonize = function(format) {
          var buttonHolder;
          buttonHolder = jQuery('<span></span>');
          buttonHolder.hallobutton({
            label: format,
            editable: _this.options.editable,
            command: format,
            uuid: _this.options.uuid,
            cssClass: _this.options.buttonCssClass
          });
          return buttonset.append(buttonHolder);
        };
        _ref = this.options.formattings;
        for (format in _ref) {
          enabled = _ref[format];
          if (enabled) buttonize(format);
        }
        buttonset.buttonset();
        return this.options.toolbar.append(buttonset);
      },
      _init: function() {}
    });
  })(jQuery);

  (function(jQuery) {
    return jQuery.widget("IKS.halloreundo", {
      options: {
        editable: null,
        toolbar: null,
        uuid: '',
        buttonCssClass: null
      },
      _create: function() {
        var buttonize, buttonset;
        var _this = this;
        buttonset = jQuery("<span class=\"" + this.widgetName + "\"></span>");
        buttonize = function(cmd, label) {
          var buttonElement;
          buttonElement = jQuery('<span></span>');
          buttonElement.hallobutton({
            uuid: _this.options.uuid,
            editable: _this.options.editable,
            label: label,
            icon: cmd === 'undo' ? 'icon-arrow-left' : 'icon-arrow-right',
            command: cmd,
            queryState: false,
            cssClass: _this.options.buttonCssClass
          });
          return buttonset.append(buttonElement);
        };
        buttonize("undo", "Undo");
        buttonize("redo", "Redo");
        buttonset.buttonset();
        return this.options.toolbar.append(buttonset);
      },
      _init: function() {}
    });
  })(jQuery);

  (function(jQuery) {
    return jQuery.widget('IKS.halloblock', {
      options: {
        editable: null,
        toolbar: null,
        uuid: '',
        elements: ['h1', 'h2', 'h3', 'p', 'pre', 'blockquote'],
        buttonCssClass: null
      },
      _create: function() {
        var buttonset, contentId, target;
        buttonset = jQuery("<span class=\"" + this.widgetName + "\"></span>");
        contentId = "" + this.options.uuid + "-" + this.widgetName + "-data";
        target = this._prepareDropdown(contentId);
        buttonset.append(target);
        buttonset.append(this._prepareButton(target));
        return this.options.toolbar.append(buttonset);
      },
      _prepareDropdown: function(contentId) {
        var addElement, containingElement, contentArea, element, _i, _len, _ref;
        var _this = this;
        contentArea = jQuery("<div id=\"" + contentId + "\"></div>");
        containingElement = this.options.editable.element.get(0).tagName.toLowerCase();
        addElement = function(element) {
          var el, queryState;
          el = jQuery("<" + element + " class=\"menu-item\">" + element + "</" + element + ">");
          if (containingElement === element) el.addClass('selected');
          if (containingElement !== 'div') el.addClass('disabled');
          el.bind('click', function() {
            if (el.hasClass('disabled')) return;
            return _this.options.editable.execute('formatBlock', element.toUpperCase());
          });
          queryState = function(event) {
            var block;
            block = document.queryCommandValue('formatBlock');
            if (block.toLowerCase() === element) {
              el.addClass('selected');
              return;
            }
            return el.removeClass('selected');
          };
          _this.options.editable.element.bind('halloenabled', function() {
            return _this.options.editable.element.bind('keyup paste change mouseup', queryState);
          });
          _this.options.editable.element.bind('hallodisabled', function() {
            return _this.options.editable.element.unbind('keyup paste change mouseup', queryState);
          });
          return el;
        };
        _ref = this.options.elements;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          element = _ref[_i];
          contentArea.append(addElement(element));
        }
        return contentArea;
      },
      _prepareButton: function(target) {
        var buttonElement;
        buttonElement = jQuery('<span></span>');
        buttonElement.hallodropdownbutton({
          uuid: this.options.uuid,
          editable: this.options.editable,
          label: 'block',
          icon: 'icon-text-height',
          target: target,
          cssClass: this.options.buttonCssClass
        });
        return buttonElement;
      }
    });
  })(jQuery);

  (function(jQuery) {
    return jQuery.widget("IKS.hallolink", {
      options: {
        editable: null,
        toolbar: null,
        uuid: "",
        link: true,
        image: true,
        defaultUrl: 'http://',
        dialogOpts: {
          autoOpen: false,
          width: 540,
          height: 95,
          title: "Enter Link",
          modal: true,
          resizable: false,
          draggable: false,
          dialogClass: 'hallolink-dialog'
        }
      },
      _create: function() {
        var buttonize, buttonset, dialog, dialogId, dialogSubmitCb, urlInput, widget;
        var _this = this;
        widget = this;
        dialogId = "" + this.options.uuid + "-dialog";
        dialog = jQuery("<div id=\"" + dialogId + "\"><form action=\"#\" method=\"post\" class=\"linkForm\"><input class=\"url\" type=\"text\" name=\"url\" value=\"" + this.options.defaultUrl + "\" /><input type=\"submit\" id=\"addlinkButton\" value=\"Insert\" /></form></div>");
        urlInput = jQuery('input[name=url]', dialog).focus(function(e) {
          return this.select();
        });
        dialogSubmitCb = function() {
          var link;
          link = urlInput.val();
          widget.options.editable.restoreSelection(widget.lastSelection);
          if (((new RegExp(/^\s*$/)).test(link)) || link === widget.options.defaultUrl) {
            if (widget.lastSelection.collapsed) {
              widget.lastSelection.setStartBefore(widget.lastSelection.startContainer);
              widget.lastSelection.setEndAfter(widget.lastSelection.startContainer);
              window.getSelection().addRange(widget.lastSelection);
            }
            document.execCommand("unlink", null, "");
          } else {
            if (widget.lastSelection.startContainer.parentNode.href === void 0) {
              document.execCommand("createLink", null, link);
            } else {
              widget.lastSelection.startContainer.parentNode.href = link;
            }
          }
          widget.options.editable.element.trigger('change');
          widget.options.editable.removeAllSelections();
          dialog.dialog('close');
          return false;
        };
        dialog.find("form").submit(dialogSubmitCb);
        buttonset = jQuery("<span class=\"" + widget.widgetName + "\"></span>");
        buttonize = function(type) {
          var button, id;
          id = "" + _this.options.uuid + "-" + type;
          buttonset.append(jQuery("<input id=\"" + id + "\" type=\"checkbox\" /><label for=\"" + id + "\" class=\"btn anchor_button\" ><i class=\"icon-bookmark\"></i></label>").button());
          button = jQuery("#" + id, buttonset);
          button.bind("change", function(event) {
            widget.lastSelection = widget.options.editable.getSelection();
            urlInput = jQuery('input[name=url]', dialog);
            if (widget.lastSelection.startContainer.parentNode.href === void 0) {
              urlInput.val(widget.options.defaultUrl);
            } else {
              urlInput.val(jQuery(widget.lastSelection.startContainer.parentNode).attr('href'));
              jQuery(urlInput[0].form).find('input[type=submit]').val('update');
            }
            dialog.dialog('open');
            return widget.options.editable.protectFocusFrom(dialog);
          });
          return _this.element.bind("keyup paste change mouseup", function(event) {
            var nodeName, start;
            start = jQuery(widget.options.editable.getSelection().startContainer);
            nodeName = start.prop('nodeName') ? start.prop('nodeName') : start.parent().prop('nodeName');
            if (nodeName && nodeName.toUpperCase() === "A") {
              button.attr("checked", true);
              button.next().addClass("ui-state-clicked");
              return button.button("refresh");
            } else {
              button.attr("checked", false);
              button.next().removeClass("ui-state-clicked");
              return button.button("refresh");
            }
          });
        };
        if (this.options.link) buttonize("A");
        if (this.options.link) {
          buttonset.buttonset();
          this.options.toolbar.append(buttonset);
          return dialog.dialog(this.options.dialogOpts);
        }
      },
      _init: function() {}
    });
  })(jQuery);

  (function(jQuery) {
    return jQuery.widget("IKS.hallojustify", {
      options: {
        editable: null,
        toolbar: null,
        uuid: '',
        buttonCssClass: null
      },
      _create: function() {
        var buttonize, buttonset;
        var _this = this;
        buttonset = jQuery("<span class=\"" + this.widgetName + "\"></span>");
        buttonize = function(alignment) {
          var buttonElement;
          buttonElement = jQuery('<span></span>');
          buttonElement.hallobutton({
            uuid: _this.options.uuid,
            editable: _this.options.editable,
            label: alignment,
            command: "justify" + alignment,
            icon: "icon-align-" + (alignment.toLowerCase()),
            cssClass: _this.options.buttonCssClass
          });
          return buttonset.append(buttonElement);
        };
        buttonize("Left");
        buttonize("Center");
        buttonize("Right");
        buttonset.buttonset();
        return this.options.toolbar.append(buttonset);
      },
      _init: function() {}
    });
  })(jQuery);

  (function(jQuery) {
    return jQuery.widget('IKS.hallobutton', {
      button: null,
      options: {
        uuid: '',
        label: null,
        icon: null,
        editable: null,
        command: null,
        queryState: true,
        cssClass: null
      },
      _create: function() {
        var id, _base, _ref;
        if ((_ref = (_base = this.options).icon) == null) {
          _base.icon = "icon-" + (this.options.label.toLowerCase());
        }
        id = "" + this.options.uuid + "-" + this.options.label;
        this.element.append(this._createButton(id, this.options.command));
        this.element.append(this._createLabel(id, this.options.command, this.options.label, this.options.icon));
        if (this.options.cssClass) {
          this.element.find('label').addClass(this.options.cssClass);
        }
        this.button = this.element.find('input');
        this.button.button();
        if (this.options.cssClass) this.button.addClass(this.options.cssClass);
        return this.button.data('hallo-command', this.options.command);
      },
      _init: function() {
        var editableElement, queryState;
        var _this = this;
        if (!this.button) this.button = this._prepareButton();
        this.element.append(this.button);
        if (this.options.command) {
          this.button.bind('change', function(event) {
            return _this.options.editable.execute(_this.options.command);
          });
        }
        if (!this.options.queryState) return;
        editableElement = this.options.editable.element;
        queryState = function(event) {
          if (!_this.options.command) return;
          try {
            return _this.checked(document.queryCommandState(_this.options.command));
          } catch (e) {

          }
        };
        editableElement.bind('halloenabled', function() {
          return editableElement.bind('keyup paste change mouseup hallomodified', queryState);
        });
        return editableElement.bind('hallodisabled', function() {
          return editableElement.unbind('keyup paste change mouseup hallomodified', queryState);
        });
      },
      enable: function() {
        return this.button.button('enable');
      },
      disable: function() {
        return this.button.button('disable');
      },
      refresh: function() {
        return this.button.button('refresh');
      },
      checked: function(checked) {
        this.button.attr('checked', checked);
        return this.refresh();
      },
      _createButton: function(id) {
        return jQuery("<input id=\"" + id + "\" type=\"checkbox\" />");
      },
      _createLabel: function(id, command, label, icon) {
        return jQuery("<label for=\"" + id + "\" class=\"" + command + "_button\" title=\"" + label + "\"><i class=\"" + icon + "\"></i></label>");
      }
    });
  })(jQuery);

  (function(jQuery) {
    return jQuery.widget('IKS.hallodropdownbutton', {
      button: null,
      options: {
        uuid: '',
        label: null,
        icon: null,
        editable: null,
        target: '',
        cssClass: null
      },
      _create: function() {
        var _base, _ref;
        return (_ref = (_base = this.options).icon) != null ? _ref : _base.icon = "icon-" + (this.options.label.toLowerCase());
      },
      _init: function() {
        var target;
        var _this = this;
        target = jQuery(this.options.target);
        target.css('position', 'absolute');
        target.addClass('dropdown-menu');
        target.hide();
        if (!this.button) this.button = this._prepareButton();
        this.button.bind('click', function() {
          if (target.hasClass('open')) {
            _this._hideTarget();
            return;
          }
          return _this._showTarget();
        });
        target.bind('click', function() {
          return _this._hideTarget();
        });
        this.options.editable.element.bind('hallodeactivated', function() {
          return _this._hideTarget();
        });
        return this.element.append(this.button);
      },
      _showTarget: function() {
        var target;
        target = jQuery(this.options.target);
        this._updateTargetPosition();
        target.addClass('open');
        return target.show();
      },
      _hideTarget: function() {
        var target;
        target = jQuery(this.options.target);
        target.removeClass('open');
        return target.hide();
      },
      _updateTargetPosition: function() {
        var bottom, left, target, _ref;
        target = jQuery(this.options.target);
        _ref = this.element.position(), bottom = _ref.bottom, left = _ref.left;
        target.css('top', bottom);
        return target.css('left', left - 20);
      },
      _prepareButton: function() {
        var button, buttonEl, id;
        id = "" + this.options.uuid + "-" + this.options.label;
        buttonEl = jQuery("<button id=\"" + id + "\" data-toggle=\"dropdown\" data-target=\"#" + (this.options.target.attr('id')) + "\" title=\"" + this.options.label + "\">\n  <span class=\"ui-button-text\"><i class=\"" + this.options.icon + "\"></i></span>\n</button>");
        if (this.options.cssClass) buttonEl.addClass(this.options.cssClass);
        button = buttonEl.button();
        return button;
      }
    });
  })(jQuery);
