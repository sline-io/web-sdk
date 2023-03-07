/**
 * The browser console
 *
 * @property console
 * @private
 * @type object
 */
window.console = window.console || {};
window.console.log = this.console.log || function () {};

/**
 * Expose our sdk
 */
(function (root) {
  root.Sline = root.Sline || {};
  root.Sline.VERSION = "2.2.3";
})(this);

/**
 * main sdk
 */
(function (root) {
  root.Sline = root.Sline || {};

  /**
   * Contains all Sline API classes and functions.
   * @name Sline
   * @namespace
   *
   * Contains all Sline API classes and functions.
   */
  var Sline = root.Sline;

  var svgLoader = `<svg version="1.1" id="L4" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" style="height: 25px; width: 66px; margin-left: -20px; margin-top: -3px;"
  viewBox="0 0 100 100" enable-background="new 0 0 0 0" xml:space="preserve">
  <circle fill="#fff" stroke="none" cx="6" cy="50" r="10">
    <animate
      attributeName="opacity"
      dur="1s"
      values="0;1;0"
      repeatCount="indefinite"
      begin="0.1"/>    
  </circle>
  <circle fill="#fff" stroke="none" cx="46" cy="50" r="10">
    <animate
      attributeName="opacity"
      dur="1s"
      values="0;1;0"
      repeatCount="indefinite" 
      begin="0.2"/>       
  </circle>
  <circle fill="#fff" stroke="none" cx="86" cy="50" r="10">
    <animate
      attributeName="opacity"
      dur="1s"
      values="0;1;0"
      repeatCount="indefinite" 
      begin="0.3"/>     
  </circle>
  <circle fill="#fff" stroke="none" cx="126" cy="50" r="10">
    <animate
      attributeName="opacity"
      dur="1s"
      values="0;1;0"
      repeatCount="indefinite" 
      begin="0.4"/>     
  </circle>
  <circle fill="#fff" stroke="none" cx="166" cy="50" r="10">
    <animate
      attributeName="opacity"
      dur="1s"
      values="0;1;0"
      repeatCount="indefinite" 
      begin="0.5"/>     
  </circle>
</svg>`;

  /**
   * Call this method first to set your authentication key.
   * @param {Config} config Configuration options
   */
  Sline.Initialize = function (config) {
    if (typeof config !== "object") {
      throw "Invalid initialization: configuration options should be an object";
    }

    Sline._Initialize(config);
    Sline.InitializeCheckoutButton(config);
    Sline._InitializeDurationSelector(config);
  };

  /**
   * This method is for Sline's own private use.
   * @param {Object} config Configuration options
   */
  Sline._Initialize = function (config) {
    if (!config.retailer) {
      throw "Invalid configuration: missing retailer information";
    }

    Sline.retailerSlug = config.retailer;
    if (typeof config?.production === "boolean" && config.production) {
      Sline.apiURL = "https://api.sline.io/checkout/cart";
      Sline.baseCheckoutURL = "https://checkout.sline.io/checkout/";
    } else {
      Sline.apiURL = "https://api.staging.sline.io/checkout/cart";
      Sline.baseCheckoutURL = "https://checkout.staging.sline.io/checkout/";
    }
    Sline.cart = [];
    Sline.checkoutURL = "";
    Sline.prices = [];
    Sline.durations = [];
  };

  /**
   * Configures the checkout button and its events
   * @param {Object} config Configuration options
   */
  Sline.InitializeCheckoutButton = function (config) {
    if (
      !config.checkoutButton ||
      (!config.checkoutButton.id && config.checkoutButton?.classPath.toString().trim().length === 0) ||
      (!config.checkoutButton.classPath && config.checkoutButton?.id.toString().trim().length === 0)
    ) {
      throw "Invalid configuration: missing checkout button id or classPath";
    }

    const checkoutButton = config.checkoutButton.id ? document.getElementById(config.checkoutButton.id) : document.querySelectorAll(config.checkoutButton.classPath);
    if (!checkoutButton) {
      throw "Invalid configuration: checkout button does not exist";
    }

    Sline.checkoutButton = {
      id: config.checkoutButton.id,
      classPath: config.checkoutButton.classPath,
      prefix: config?.checkoutButton?.prefix?.toString()?.trim() ?? "",
      suffix: config?.checkoutButton?.suffix?.toString()?.trim() ?? "",
      events: {
        customOnClickEvent: config?.checkoutButton?.events?.customOnClickEvent
          ? !!config?.checkoutButton?.events?.customOnClickEvent
          : false,
      },
    };

    if (!Sline.checkoutButton.events.customOnClickEvent && config.checkoutButton.id) {
      checkoutButton.removeEventListener("click", Sline.OnCheckoutButtonClick);
      checkoutButton.addEventListener("click", Sline.OnCheckoutButtonClick);
    } else if (!Sline.checkoutButton.events.customOnClickEvent && config.checkoutButton.classPath) {
      const buttons = document.querySelectorAll(config.checkoutButton.classPath);
      if (buttons.length) {
        buttons.forEach(button => {
          button.removeEventListener("click", Sline.OnCheckoutButtonClick);
          button.addEventListener("click", Sline.OnCheckoutButtonClick);
        })
      }
    }
  };

  /**
   * Catches the event on the checkout button click
   * @param {Event} e Event generated on click
   */
  Sline.OnCheckoutButtonClick = async function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (Sline.cart.length === 0) return false

    e.target.setAttribute("disabled", "disabled");
    e.target.innerHTML = `<div style="height: 25px; text-align: center;">${svgLoader}</div>`;
    await Sline._GenerateCheckoutURL(Sline.cart)
    .then(response => {
      if (!Sline.checkoutButton.events.customOnClickEvent) {
        location.href = Sline.checkoutURL
      }
      return response;
    })
  };

  /**
   * Initializes the duration selector and its events
   * @param {Object} config Configuration options
   */
  Sline._InitializeDurationSelector = function (config) {
    Sline.durationSelector = {
      id: config.durationSelector?.id ?? null,
      value: null,
    };

    const durationSelector = document.getElementById(Sline.durationSelector.id);
    if (durationSelector) {
      durationSelector.removeEventListener(
        "click",
        Sline._OnDurationSelectorClick
      );
      durationSelector.addEventListener(
        "click",
        Sline._OnDurationSelectorClick
      );
    }

    if (!durationSelector && Sline.durationSelector.id) {
      throw "Invalid configuration: duration selector does not exist";
    }
  };

  /**
   * Catches the event when the duration changes
   * @param {Event} e Event generated on click
   */
  Sline._OnDurationSelectorClick = async function (e) {
    if (e.target.type === "radio") {
      Sline.durationSelector.value = e.target.value;
      Sline.cart.forEach((item, k) => {
        Sline.cart[k].duration = e.target.value;
      });

      Sline._UpdateCheckoutButton();
    }
  };

  /**
   * Add Product to Cart
   * @param {string} sku of the product
   * @param {int} qty of the product
   */
  Sline.AddCart = function (sku, qty) {
    Sline.UpdateCart(sku, qty);
  };

  /**
   * Update Product in Cart
   * @param {string} sku of the product
   * @param {int} qty of the product
   */
  Sline.UpdateCart = async function (sku, qty) {
    var index = Sline.cart.findIndex((x) => x.sku === sku);
    if (index !== -1) {
      Sline.cart[index].quantity = Number(qty);
    } else {
      Sline.cart.push({
        sku: sku,
        quantity: Number(qty),
      });
    }

    if (!Sline.prices[sku]) {
      await Sline._GetDurationsAndPrices();
    }

    Sline._UpdateCheckoutButton();
  };

  /**
   * Reset Cart
   */
  Sline.ResetCart = function () {
    Sline.cart = [];
  };

  /**
   * Generates the checkout URL for a cart
   * @param {Array} cart
   * @returns
   */
  Sline._GenerateCheckoutURL = async function (cart) {
    var url = Sline.apiURL + "/import";
    var payload = {};

    if (cart.length === 0) return false

    payload["cart"] = cart.map(item => ({sku: item.sku, quantity: item.quantity}));
    payload["retailerSlug"] = Sline.retailerSlug;
    payload["duration"] = Sline.durationSelector.value;

    var myHeaders = new Headers();
    myHeaders.append("accept", "application/json");
    myHeaders.append("content-type", "application/json");
    var raw = JSON.stringify(payload);
    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };
    try {
      const response = await fetch(url, requestOptions);
      const responseData = await response.json();
      Sline.checkoutURL = Sline.baseCheckoutURL + responseData.id;
      return responseData;
    } catch (error) {
      return console.warn(error);
    }
  };

  /**
   * Gets the duration options for a cart
   */
  Sline._GetDurationsAndPrices = debounce(async function () {
    var url = Sline.apiURL + "/pricing";
    var payload = {};
    payload["cart"] = Sline.cart;
    payload["retailerSlug"] = Sline.retailerSlug;

    var myHeaders = new Headers();
    myHeaders.append("accept", "application/json");
    myHeaders.append("content-type", "application/json");
    var raw = JSON.stringify(payload);
    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };
    try {
      const response = await fetch(url, requestOptions);
      const responseData = await response.json().then((res) => {
        Sline.cart.forEach((item) => {
          //Sets the durations list and attribute a default duration for each item if no duration has been selected by the user
          Sline.durations = res
            .filter(duration => duration.productsPriceBreakdown.length === Sline.cart.length)
            .map((duration) => duration.numberOfInstalments)
            .sort((a, b) => a - b);
          if (!Sline.durationSelector.value) {
            Sline.durationSelector.value =
              Sline.durations[Sline.durations.length - 1];
          }
        });

        res.forEach((duration) => {
          //Sets the price for each iteam based on the productPriceBreakdown
          duration.productsPriceBreakdown.forEach((productPrice, k) => {
            //TODO A corriger quand la lambda renverra la sku
            if (!Sline.prices[productPrice.sku ?? Sline.cart[k].sku]) {
              Sline.prices[productPrice.sku ?? Sline.cart[k].sku] = {};
            }

            Sline.prices[productPrice.sku ?? Sline.cart[k].sku][
              `${duration.numberOfInstalments}`
            ] = {
              firstInstalmentPrice: productPrice.pricing.firstInstalmentPrice,
              otherInstalmentPrice: productPrice.pricing.otherInstalmentPrice,
            };
          });
        });

        // Event that can be catched by the retailer's dev team
        document.body.dispatchEvent(
          new Event("SlinePricesReady", {
            bubbles: true,
          })
        );

        Sline._UpdateCheckoutButton();
      });
      return responseData;
    } catch (error) {
      return console.warn(error);
    }
  }, 200);

  /**
   * Updates the checkout button text
   */
  Sline._UpdateCheckoutButton = async function () {
    //somme des prices
    const buttons = Sline.checkoutButton.id ? [document.getElementById(Sline.checkoutButton.id)] : document.querySelectorAll(Sline.checkoutButton.classPath);
    
    buttons.forEach(checkoutButton => {
      checkoutButton.setAttribute("disabled", "disabled");
  
      let minPrice = 0;
      if (Sline.checkoutButton.id) {
        Sline.cart.forEach((item, k) => {
          minPrice += Sline.prices[item.sku]
            ? Sline.prices[item.sku][Sline.durationSelector.value].otherInstalmentPrice.amount *
              item.quantity
            : 0;
        });
      } else {
        const sku = checkoutButton.getAttribute('data-sku')
        const index = Sline.cart.map(item => item.sku).indexOf(sku)
        if (Sline.prices[sku]) {
          minPrice = Sline.prices[sku][Sline.durationSelector.value].otherInstalmentPrice.amount * Sline.cart[index].quantity
        }
      }
  
      if (
        Sline.checkoutButton.prefix.length ||
        Sline.checkoutButton.suffix.length
      ) {
        checkoutButton.textContent = `${Sline.checkoutButton.prefix} ${
          minPrice / 100
        }${Sline._GetCurrencySymbol()} ${Sline.checkoutButton.suffix}`;
      }
  
      checkoutButton.removeAttribute("disabled");
    })
  };

  /**
   * Returns a currency symbol based on its ISO name
   * @returns currency symbol
   */
  Sline._GetCurrencySymbol = function () {
    let currencySymbol = "";
    const firstKey = Object.keys(Sline.prices)[0];

    if (!Sline.prices[firstKey]) return "€";

    switch (
      Sline.prices[firstKey][Sline.durations[0]].otherInstalmentPrice.currency
    ) {
      case "USD":
        currencySymbol = "$";
        break;

      default:
        currencySymbol = "€";
        break;
    }

    return currencySymbol;
  };

  /**
   * Calculates the price for a product and formats it
   * @param {Number} sku Item SKU
   * @param {Number} qty Qauntity
   * @returns
   */
  Sline.GetPriceForProductWithDuration = function (sku, qty) {
    return (
      (Sline.prices[sku]
        ? (Sline.prices[sku][Sline.durationSelector.value].otherInstalmentPrice
            .amount *
            qty) /
          100
        : 0) + Sline._GetCurrencySymbol()
    );
  };

  function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(this, args);
      }, timeout);
    };
  }
})(this);