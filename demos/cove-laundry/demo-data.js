
(function () {
  "use strict";

  var KEY = "cove-laundry-demo-v1";

  var BRAND = {
    company: "Cobalt Cove Hotel",
    app: "Cove Laundry",
    domain: "laundry.cobaltcove.example",
  };

  var SITES = [
    { id: "harbour", label: "Harbour Wing" },
    { id: "garden", label: "Garden Suites" },
  ];

  var STAFF = ["Thandi M.", "Sipho K.", "Lerato N.", "Johan V.", "Ayanda D.", "Nomsa B."];

  var GUESTS = [
    "Emma Clarke", "Daniel Mokoena", "Priya Naidoo", "Lucas Ferreira", "Aisha Patel",
    "Tom Becker", "Naledi Dlamini", "Grace O'Neill", "Ruan du Plessis", "Mei Chen",
    "Kwame Mensah", "Sofia Rossi", "Liam Walsh", "Zanele Khumalo", "Hannah Meyer",
    "Omar Haddad", "Chloe Martin", "Pieter Botha", "Amara Okafor", "Jack Thompson",
    "Lindiwe Sithole", "Mateo García", "Ingrid Larsen", "Bongani Zulu", "Yuki Tanaka",
  ];

  // [name, relative frequency, max quantity]
  var ITEMS = [
    ["T-shirt", 10, 6], ["Socks (pairs)", 9, 7], ["Underwear", 8, 7], ["Jeans", 6, 3],
    ["Shirt", 6, 4], ["Towel", 5, 3], ["Shorts", 4, 3], ["Pyjamas", 3, 2],
    ["Hoodie", 3, 2], ["Dress", 2, 2], ["Jersey", 2, 2], ["Leggings", 2, 3],
    ["Bed sheet", 1, 2], ["Swimwear", 2, 2],
  ];

  /*helpers*/

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function dayKey(d) {
    var t = new Date(d);
    return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
  }

  function uid(prefix, rnd) {
    var r = rnd || Math.random;
    var s = "";
    for (var i = 0; i < 10; i++) s += "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(r() * 36)];
    return (prefix || "ord_") + s;
  }

  function pick(arr, r) { return arr[Math.floor(r() * arr.length)]; }

  function pickItem(r) {
    var total = ITEMS.reduce(function (s, x) { return s + x[1]; }, 0);
    var n = r() * total;
    for (var i = 0; i < ITEMS.length; i++) { n -= ITEMS[i][1]; if (n <= 0) return ITEMS[i]; }
    return ITEMS[0];
  }

  function makeItems(orderId, r) {
    var types = 2 + Math.floor(r() * 4);
    var used = {};
    var out = [];
    for (var i = 0; i < types; i++) {
      var it = pickItem(r);
      if (used[it[0]]) continue;
      used[it[0]] = 1;
      out.push({ id: orderId + "_i" + out.length, name: it[0], quantity: 1 + Math.floor(r() * it[2]) });
    }
    return out;
  }

  function blankOrder(o) {
    return Object.assign({
      id: "", clientName: "", roomNumber: "", site: "harbour", items: [],
      basketPhoto: null, status: "pending", submittedAt: null,
      collectedBy: null, collectedAt: null, itemChecks: {},
      washed: false, dried: false, folded: false,
      completedPhoto: null, completedBy: null, completedAt: null,
      loggedBy: null, notify: false, local: false, demoUser: false,
    }, o);
  }

  function generate(now) {
    now = now || new Date();
    var r = mulberry32(20261020);
    var orders = [];
    var today = new Date(now); today.setHours(0, 0, 0, 0);
    var DAYS = 90;

    for (var back = DAYS - 1; back >= 0; back--) {
      var day = new Date(today); day.setDate(day.getDate() - back);
      var dow = day.getDay();
      var weekend = dow === 0 || dow === 6 || dow === 5;
      var count = 6 + (weekend ? 5 : 0) + Math.floor(r() * 6);
      // Busier in the most recent month (more rooms on the system).
      if (back < 30) count += 2;
      var progress = 1 - back / DAYS; // 0 → 1 across the period
      var baseTurn = 15 - progress * 7; // hours, trending down

      for (var n = 0; n < count; n++) {
        var id = uid("ord_", r);
        var site = r() < 0.62 ? "harbour" : "garden";
        var submitted = new Date(day.getTime() + (6.5 + r() * 12.5) * 36e5);
        var collected = new Date(submitted.getTime() + (0.25 + r() * 1.8) * 36e5);
        var turn = Math.max(2.5, baseTurn + (r() - 0.5) * 9);
        var completed = new Date(submitted.getTime() + turn * 36e5);
        if (completed <= collected) completed = new Date(collected.getTime() + 2 * 36e5);
        var staff = pick(STAFF, r);
        var finisher = r() < 0.8 ? staff : pick(STAFF, r);
        var items = makeItems(id, r);
        var o = blankOrder({
          id: id,
          clientName: pick(GUESTS, r),
          roomNumber: String(1 + Math.floor(r() * 50)),
          site: site,
          items: items,
          basketPhoto: "sample:" + Math.floor(r() * 1e6),
          submittedAt: submitted.toISOString(),
          loggedBy: r() < 0.1 ? staff : null,
        });
        if (submitted > now) continue; // not happened yet today

        var checks = {};
        items.forEach(function (it) { checks[it.id] = true; });

        if (completed <= now) {
          Object.assign(o, {
            status: "completed", collectedBy: staff, collectedAt: collected.toISOString(),
            itemChecks: checks, washed: true, dried: true, folded: true,
            completedPhoto: "folded:" + Math.floor(r() * 1e6), completedBy: finisher,
            completedAt: completed.toISOString(),
          });
        } else if (collected <= now) {
          var stage = r();
          Object.assign(o, {
            status: "in_progress", collectedBy: staff, collectedAt: collected.toISOString(),
            itemChecks: checks, washed: stage > 0.3, dried: stage > 0.7, folded: false,
          });
        }
        orders.push(o);
      }
    }

    // One active basket per room per site (mirrors the DB unique index).
    var active = {};
    orders.forEach(function (o) {
      if (o.status === "completed") return;
      var k = o.site + ":" + o.roomNumber;
      var tries = 0;
      while (active[k] && tries < 60) {
        o.roomNumber = String(1 + Math.floor(r() * 50));
        k = o.site + ":" + o.roomNumber; tries++;
      }
      active[k] = 1;
    });

    // The featured guest Emma Clarke, Room 12, Harbour Wing.
    orders = orders.filter(function (o) {
      return !(o.status !== "completed" && o.site === "harbour" && o.roomNumber === "12");
    });
    var emmaPast = [
      { back: 9, hour: 8.5, turn: 9.2, items: [["T-shirt", 4], ["Jeans", 2], ["Socks (pairs)", 5]] },
      { back: 3, hour: 17.2, turn: 7.4, items: [["Dress", 1], ["Towel", 2], ["Underwear", 4], ["Pyjamas", 1]] },
    ];
    emmaPast.forEach(function (p, idx) {
      var id = uid("ord_", r);
      var sub = new Date(today); sub.setDate(sub.getDate() - p.back);
      sub = new Date(sub.getTime() + p.hour * 36e5);
      var items = p.items.map(function (x, i) { return { id: id + "_i" + i, name: x[0], quantity: x[1] }; });
      var checks = {}; items.forEach(function (it) { checks[it.id] = true; });
      orders.push(blankOrder({
        id: id, clientName: "Emma Clarke", roomNumber: "12", site: "harbour", items: items,
        basketPhoto: "sample:" + (4100 + idx), status: "completed", submittedAt: sub.toISOString(),
        collectedBy: idx ? "Lerato N." : "Sipho K.", collectedAt: new Date(sub.getTime() + 0.6 * 36e5).toISOString(),
        itemChecks: checks, washed: true, dried: true, folded: true,
        completedPhoto: "folded:" + (5200 + idx), completedBy: idx ? "Lerato N." : "Sipho K.",
        completedAt: new Date(sub.getTime() + p.turn * 36e5).toISOString(),
      }));
    });
    var eid = uid("ord_", r);
    var eItems = [["T-shirt", 3], ["Shorts", 2], ["Swimwear", 1], ["Towel", 2]].map(function (x, i) {
      return { id: eid + "_i" + i, name: x[0], quantity: x[1] };
    });
    orders.push(blankOrder({
      id: eid, clientName: "Emma Clarke", roomNumber: "12", site: "harbour", items: eItems,
      basketPhoto: "sample:4242", status: "pending",
      submittedAt: new Date(now.getTime() - 22 * 6e4).toISOString(),
    }));

    // A staff-logged basket that is on the phone but not uploaded yet.
    var lid = uid("local_", r);
    orders.push(blankOrder({
      id: lid, clientName: "Bongani Zulu", roomNumber: "7", site: "garden",
      items: [["Shirt", 3], ["Jeans", 1], ["Socks (pairs)", 3]].map(function (x, i) {
        return { id: lid + "_i" + i, name: x[0], quantity: x[1] };
      }),
      basketPhoto: "sample:777", status: "in_progress",
      submittedAt: new Date(now.getTime() - 48 * 6e4).toISOString(),
      collectedBy: "Thandi M.", collectedAt: new Date(now.getTime() - 48 * 6e4).toISOString(),
      loggedBy: "Thandi M.", local: true,
    }));
    // Make sure room 7 at Garden Suites has no other active basket.
    orders.forEach(function (o) {
      if (o.id !== lid && o.site === "garden" && o.roomNumber === "7" && o.status !== "completed") o.roomNumber = "44";
    });

    orders.sort(function (a, b) { return a.submittedAt < b.submittedAt ? 1 : -1; });
    return orders;
  }

  function freshState(now) {
    return {
      day: dayKey(now || new Date()),
      orders: generate(now),
      mode: "guest",
      guest: { name: "Emma Clarke", roomNumber: "12", site: "harbour" },
      staff: { name: "Thandi M.", site: "harbour" },
      guestPush: "default",
      signal: false,
      pendingPush: [],
      tour: {},
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        // The seeded history is anchored to today, so start fresh each day.
        if (s && s.day === dayKey(new Date()) && Array.isArray(s.orders)) return s;
      }
    } catch (e) { /* storage unavailable: run in memory */ }
    return freshState();
  }

  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) { return false; }
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    return freshState();
  }

  window.CoveData = {
    KEY: KEY, BRAND: BRAND, SITES: SITES, STAFF: STAFF, GUESTS: GUESTS, ITEMS: ITEMS,
    load: load, save: save, reset: reset, uid: uid, dayKey: dayKey, blankOrder: blankOrder,
    siteLabel: function (id) { var s = SITES.filter(function (x) { return x.id === id; })[0]; return s ? s.label : id; },
  };
})();
