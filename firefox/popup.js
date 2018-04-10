// ---------- refresh opened windows list ----------
function refreshOpenedWindows() {
  browser.tabs.query({}).then((tabs) => {
    openedWindows = [];
    for (let tab of tabs) {
      let win = openedWindows.find(w => w.windowId == tab.windowId);
      if (win !== undefined) {
        win.tabs.push(tab);
      } else {
        openedWindows.push({
          windowId: tab.windowId,
          tabs: [tab]
        });
      }
    }
    // sort tabs
    for (let win of openedWindows) {
      win.tabs.sort((t1,t2) => t1.index - t2.index);
    }
    // sort windows
    openedWindows.sort((w1,w2) => w1.index - w2.index);
  }).then(updateOpenedWindows);
}

// ---------- create simple div ----------

Vue.component('single-window', {
  props: ['window', 'actions', 'notLast', 'windowIndex', 'group'],
  created: function () {
  },
  methods: {
    saveWindow: function () {
      dataPort.postMessage({
        "actions": ["save-window"],
        "save-window": this.window
      });
    },
    removeWindow: function () {
      dataPort.postMessage({
        "actions": ["remove-window"],
        "remove-window": this.windowIndex
      });
    },
    restoreWindow: function () {
      browser.windows.create({
        url: this.window.tabs.map((t) => t.url)
      });
    }
  },
  render: function(createElement) {
    return createElement("div", {
      class: {
        window: true,
        addsep: this.notLast
      },
      attrs: {
        title: "Click on an icon to switch to tab"
      }
    }, [
      createElement("div", { class: "tabswrapper" }, 
        this.window.tabs.map(tab => createElement("single-tab", {
          props: {
            tab: tab,
            group: this.group
          }
        }))
      ),
      this.actions.includes("s") ? createElement("div", {
        attrs: {
          class: "savewinbtn fa fa-plus",
          title: "Save window"
        },
        on: { click: this.saveWindow }
      }) : null,
      this.actions.includes("d") ? createElement("div", {
        attrs: {
          class: "delwinbtn fa fa-times",
          title: "Delete window"
        },
        on: { click: this.removeWindow }
      }) : null,
      this.actions.includes("r") ? createElement("div", {
        attrs: {
          class: "openwinbtn fa fa-window-restore",
          title: "Restore window"
        },
        on: { click: this.restoreWindow }
      }) : null,
    ])
  },
  // template: `
  //   <div :class="{ window: true, addsep: notLast }" title="Click on an icon to switch to tab">
  //     <div class="tabswrapper">
  //       <single-tab v-for="tab in window.tabs" :tab="tab" :group="group"></single-tab>
  //     </div>
  //     <div v-if="actions.includes('s')" class="savewinbtn fa fa-plus" title="Save window" @click="saveWindow"></div>
  //     <div v-if="actions.includes('d')" class="delwinbtn fa fa-times" title="Delete window" @click="removeWindow"></div>
  //     <div v-if="actions.includes('r')" class="openwinbtn fa fa-window-restore" title="Restore window" @click="restoreWindow"></div>
  //   </div>
  // `
});

// ---------- create single window ----------

function createSingleWindow(param) {
  // param.{notLast window group actions windowIndex}
  var base = document.createElement("div");
  base.title="Click on an icon to switch to tab";
  base.classList.add("window");
  if (param.notLast) {
    base.classList.add("addsep");
  }
  var tabswrapper = document.createElement("div");
  tabswrapper.classList.add("tabswrapper");
  for (let i=0; i < param.window.tabs.length; i++) {
    tabswrapper.appendChild(createSingleTab({tab: param.window.tabs[i], group: param.group}));
  }
  base.appendChild(tabswrapper);
  if (param.actions.includes('s')) {
    base.appendChild(createSimple({
      class: ["savewinbtn", "fa", "fa-plus"],
      title: "Save window",
      click: function () {
        dataPort.postMessage({
          "actions": ["save-window"],
          "save-window": param.window
        });
      }
    }
  },
  render: function (createElement) {
    if (this.tab.favIconUrl) {
      return createElement("img", {
        attrs: {
          src: this.tab.favIconUrl,
          class: "favicon",
          title: this.tab.title
        },
        on: { click: this.onClick }
      })
    } else {
      return createElement("i", {
        attrs: {
          class: "fa fa-question-circle favicon",
          title: this.tab.title
        },
        on: { click: this.onClick }
      }) 
    }
  },
  // template: `
  //   <img v-if="tab.favIconUrl" :src="tab.favIconUrl" class="favicon" :title="tab.title" @click="onClick">
  //   <i v-else class="fa fa-question-circle favicon" :title="tab.title" @click="onClick"></i>
  // `
});

// ---------- create single tab ----------

function createSingleTab(param) {
  // param.{tab group}
  var base;
  if (param.tab.favIconUrl) {
    base = document.createElement("img");
    base.src = param.tab.favIconUrl;
  } else {
    base = document.createElement("i");
    base.classList.add("fa", "fa-question-circle");
  }
  base.title = param.tab.title;
  base.classList.add("favicon");
  base.addEventListener("click", function () {
    if (param.group == "opened") {
      browser.tabs.update(param.tab.id, {active: true});
      browser.windows.update(param.tab.windowId, {focused: true});
    } else if (param.group == "saved") {
      browser.tabs.create({
        url: param.tab.url
      });
    }
  });
  return base;
}

// ---------- update log in status ----------
function updateLogInStatus () {
  var el = document.getElementById("status");
  if (!useLocal && signedIn) {
    el.innerText = "Signed in as " + remoteAccount;
  } else {
    el.innerText = "Data saved locally";
  }
}

// ---------- update log in button ----------
function updateLogInButton () {
  var el = document.getElementById("sign-in-out");
  if (signedIn) {
    el.classList.add("fa-sign-out");
    el.classList.remove("fa-google");
    el.title = "Click to sign out";
  } else {
    el.classList.remove("fa-sign-out");
    el.classList.add("fa-google");
    el.title = "Click to log in to Google";
  }
}

    // add listener
    browser.tabs.onCreated.addListener(refreshOpenedWindows);
    browser.tabs.onRemoved.addListener(refreshOpenedWindows);
  },
  methods: {
    removeSaved: function () {
      dataPort.postMessage({actions: ["remove-all-windows"]});
    },
    signInOut: function () {
      dataPort.postMessage({ actions: ["sign-in-out"] });
    },
    openHelp: function () {
      window.open("doc/help.html");
    },
  },
  render: function (createElement) {
    let children = [];
    children.push(createElement("div", { class: "section" }, "Saved windows"));

    if (this.savedWindows.length == 0) {
      children.push(createElement("div", { class: "window" }, [
        createElement("div", { class: "tabswrapper" }, "Saved windows will be displayed here")
      ]));
    } else {
      children.push(...this.savedWindows.map(
        (window, index, winarray) => createElement("single-window", {
          props: {
            "window-index": index,
            window: window,
            actions: "dr",
            "not-last": index != (winarray.length - 1),
            group: "saved"
          }
        })
      ));
      children.push(createElement("div", {
        attrs: { id: "remove-all-saved" },
        on: { click: this.removeSaved }
      }, "Remove all saved windows"));
    }

    children.push(createElement("div", { class: "section" }, "Opened Windows"));
    children.push(...this.openedWindows.map(
      (window, index, winarray) => createElement("single-window", {
        props: {
          "window-index": index,
          window: window,
          actions: "s",
          "not-last": index != (winarray.length - 1),
          group: "opened"
        }
      })
    ));

    children.push(createElement("div", { class: "vsep" }));

    children.push(createElement("div", { attrs: { id: "status" } }, this.logInStatus));

    children.push(createElement("div", { class: "button-row" }, [
      createElement("div", { 
        class: {
          fa: true,
          "fa-google": !this.signedIn,
          "fa-sign-out": this.signedIn
        },
        attrs: {
          id: "sign-in-out",
          title: this.signedIn ? "Click to sign out" : "Click to log in to Google"
        },
        on: { click: this.signInOut }
      }),
      createElement("div", {
        class: "fa fa-question",
        attrs: {
          id: "help",
          title: "Help"
        },
        on: { click: this.openHelp }
      })
    ]));

    return createElement("div", {}, children);
  }
  // template: `
  // <div id="main">
  //   <div class="section">Saved windows</div>
  //   <template v-if="savedWindows.length == 0">
  //     <div class="window">
  //       <div class="tabswrapper">
  //         Saved windows will be displayed here
  //       </div>
  //     </div>
  //   </template>
  //   <template v-else>
  //     <single-window v-for="(window, index) in savedWindows" 
  //       :window-index="index"
  //       :window="window" 
  //       actions="dr"
  //       :not-last="index != (savedWindows.length-1)"
  //       group="saved">
  //     </single-window>
  //     <div id="remove-all-saved" @click="removeSaved">
  //       Remove all saved windows
  //     </div>
  //   </template>
    
  //   <div class="section">Opened windows</div>
  //   <single-window v-for="(window, index) in openedWindows" 
  //     :window-index="index"
  //     :window="window" 
  //     actions="s"
  //     :not-last="index != (openedWindows.length-1)"
  //     group="opened">
  //   </single-window>

  //   <div class="vsep"></div>

  //   <div id="status">
  //       {{ logInStatus }}
  //   </div>

  //   <div class="button-row">
  //     <div :class="{ fa: true, 'fa-google': !signedIn, 'fa-sign-out': signedIn }" 
  //       id="sign-in-out" 
  //       @click="signInOut"
  //       :title="signedIn ? 'Click to sign out' : 'Click to log in to Google'"></div>
  //     <div class="fa fa-question" id="help" title="Help" @click="openHelp"></div>
  //   </div>
  // </div>
  // `
});

dataPort.postMessage({actions: ["refresh", "saved-windows", "use-local", "signed-in", "remote-account"]});

// get opened windows
refreshOpenedWindows();
updateSavedWindows();
updateLogInStatus();
updateLogInButton();

// add listener
browser.tabs.onCreated.addListener(refreshOpenedWindows);
browser.tabs.onRemoved.addListener(refreshOpenedWindows);

// add click listener
document.getElementById("help").addEventListener("click", () => window.open("doc/help.html"));
document.getElementById("sign-in-out").addEventListener("click", () => dataPort.postMessage({ actions: ["sign-in-out"] }));
