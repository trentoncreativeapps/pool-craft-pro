import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import * as turf from "@turf/turf";
import { generateSchematic, polygonBounds } from "./lib/schematicEngine.js";
import { buildPoolPolygon } from "./lib/poolShapes.js";
import SchematicView from "./SchematicView.jsx";
import { PLANS } from "../api/_plans.js";

// Escapes free-text values (client names, addresses, etc.) before they're interpolated
// into an HTML string passed to document.write() for printable exports.
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

// Standalone render-service (fal.ai FLUX), deployed separately from the Vercel
// app - not a relative /api path, so it needs its own origin.
const RENDER_SERVICE_URL = import.meta.env.VITE_RENDER_SERVICE_URL || "http://localhost:3001";

// ─── AFFILIATE LINKS ──────────────────────────────────────────────────────────
const AFFILIATE_TAGS = { amazon: "YOURTAG-20", homedepot: "YOUR_HD_TAG", lowes: "YOUR_LOWES_TAG", wayfair: "YOUR_WAYFAIR_TAG" };
const hdLink = (q) => `https://www.homedepot.com/s/${encodeURIComponent(q)}?cm_mmc=afl-ir-${AFFILIATE_TAGS.homedepot}`;
const lowesLink = (q) => `https://www.lowes.com/search?searchTerm=${encodeURIComponent(q)}&affid=${AFFILIATE_TAGS.lowes}`;
const wayfairLink = (q) => `https://www.wayfair.com/keyword.php?keyword=${encodeURIComponent(q)}&refid=${AFFILIATE_TAGS.wayfair}`;
const amazonLink = (asin) => `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAGS.amazon}`;
// Fallback for equipment items with no verified ASIN - a search results page
// still carries the affiliate tag correctly and can't go stale/dead the way a
// guessed product-detail link could.
const amazonSearchLink = (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}&tag=${AFFILIATE_TAGS.amazon}`;
const equipBuyLink = (asin, query) => asin ? amazonLink(asin) : amazonSearchLink(query);

const FINISH_LINKS = {
  plaster:    { name:"White Plaster Pool Finish 50lb Bag", retailer:"Amazon", link:amazonLink("B07PLASTER1"), earn:"3–8%" },
  pebble:     { name:"Pebble Tec Natural Stone Finish", retailer:"Amazon", link:amazonLink("B07PBTECEF"), earn:"3–8%" },
  quartz:     { name:"Diamond Brite Quartz Pool Finish", retailer:"Home Depot", link:hdLink("diamond brite quartz pool finish"), earn:"2–8%" },
  tile:       { name:"Blue Glass Mosaic Pool Tile 4x4", retailer:"Home Depot", link:hdLink("blue glass mosaic pool tile"), earn:"2–8%" },
  fiberglass: { name:"Fiberglass Pool Gelcoat Repair Kit", retailer:"Amazon", link:amazonLink("B08FGLSKIT"), earn:"3–8%" },
  glass_bead: { name:"Glass Bead Pool Finish Bag", retailer:"Amazon", link:amazonLink("B09GLSBEAD"), earn:"3–8%" },
};
const COLOR_LINKS = {
  arctic:    { name:"Rust-Oleum Pool Paint Arctic White", retailer:"Home Depot", link:hdLink("rustoleum pool paint white"), earn:"2–8%" },
  caribbean: { name:"Pool Paint Caribbean Blue 1gal", retailer:"Lowe's", link:lowesLink("pool paint caribbean blue"), earn:"1–4%" },
  tahoe:     { name:"In The Swim Tahoe Blue Pool Paint", retailer:"Amazon", link:amazonLink("B07TAHOEBL"), earn:"3–8%" },
  midnight:  { name:"Epoxy Pool Paint Midnight Black", retailer:"Amazon", link:amazonLink("B08MIDNPNT"), earn:"3–8%" },
  seafoam:   { name:"Pool Paint Seafoam Green 1gal", retailer:"Home Depot", link:hdLink("pool paint seafoam green"), earn:"2–8%" },
  sandstone: { name:"Sundek Pool Deck Sandstone Coat", retailer:"Amazon", link:amazonLink("B07SNDSTN1"), earn:"3–8%" },
  slate:     { name:"Pool Paint Slate Grey Epoxy", retailer:"Lowe's", link:lowesLink("pool paint slate grey epoxy"), earn:"1–4%" },
  sapphire:  { name:"Pool Paint Sapphire Blue Premium", retailer:"Amazon", link:amazonLink("B09SAPPHIR"), earn:"3–8%" },
};
const ENTRY_LINKS = {
  beach_entry:    { name:"Beach Entry Pool Transition Kit", retailer:"Amazon", link:amazonLink("B07BEACHEK"), earn:"3–8%" },
  baja_shelf:     { name:"Tanning Ledge Lounger (fits Baja shelf)", retailer:"Wayfair", link:wayfairLink("tanning ledge lounger baja shelf pool"), earn:"3–7%" },
  steps_corner:   { name:"Pool Step Handrail Stainless 60in", retailer:"Lowe's", link:lowesLink("pool step handrail stainless 60"), earn:"1–4%" },
  steps_end:      { name:"Pool Entry Step Nosing Tile", retailer:"Home Depot", link:hdLink("pool step nosing tile coping"), earn:"2–8%" },
  steps_curved:   { name:"Roman Step Pool Coping Stone", retailer:"Amazon", link:amazonLink("B07ROMCOPE"), earn:"3–8%" },
  swim_up_bar:    { name:"Outdoor Bar Stools Waterproof Set 4", retailer:"Wayfair", link:wayfairLink("waterproof outdoor bar stools pool"), earn:"3–7%" },
  infinity_edge:  { name:"Infinity Edge Catch Basin Kit", retailer:"Amazon", link:amazonLink("B08INFEDGE"), earn:"3–8%" },
  spa_attached:   { name:"Spa Blower 1.5HP Air Injector", retailer:"Amazon", link:amazonLink("B07SPABLWR"), earn:"3–8%" },
  grotto:         { name:"Natural Fieldstone Rock Kit Waterfall", retailer:"Home Depot", link:hdLink("natural fieldstone waterfall rock kit"), earn:"2–8%" },
  diving_rock:    { name:"Duraflex Diving Board 6ft with Base", retailer:"Amazon", link:amazonLink("B07DIVBRD6"), earn:"3–8%" },
  sun_shelf_umbrella: { name:"9ft Cantilever Pool Umbrella w/ Sleeve", retailer:"Wayfair", link:wayfairLink("cantilever umbrella pool shelf sleeve"), earn:"3–7%" },
  splash_pad:     { name:"Splash Pad Water Play Mat Kids", retailer:"Amazon", link:amazonLink("B09SPLSHPD"), earn:"3–8%" },
};
const HARDSCAPE_LINKS = {
  concrete_deck:   { name:"Quikrete 5000 Concrete Mix 80lb", retailer:"Home Depot", link:hdLink("quikrete 5000 concrete mix 80lb"), earn:"2–8%" },
  travertine:      { name:"Travertine Pool Coping 12x24 Silver", retailer:"Home Depot", link:hdLink("travertine pool coping 12x24"), earn:"2–8%" },
  cool_deck:       { name:"Kool Deck Pool Deck Coating 40lb", retailer:"Amazon", link:amazonLink("B07KOOLDCK"), earn:"3–8%" },
  wood_composite:  { name:"TimberTech Composite Deck Board 16ft", retailer:"Lowe's", link:lowesLink("timbertech composite deck board 16ft"), earn:"1–4%" },
  fire_pit:        { name:"Propane Fire Pit Table 48in Natural Gas", retailer:"Home Depot", link:hdLink("propane fire pit table 48 inch"), earn:"2–8%" },
  fire_bowls:      { name:"Concrete Fire Bowl 30in Propane", retailer:"Amazon", link:amazonLink("B08CONCFBL"), earn:"3–8%" },
  pergola:         { name:"12x12 Cedar Pergola Kit", retailer:"Lowe's", link:lowesLink("12x12 cedar pergola kit"), earn:"1–4%" },
  retaining_wall:  { name:"Versa-Lok Retaining Wall Block", retailer:"Home Depot", link:hdLink("versalok retaining wall block"), earn:"2–8%" },
  outdoor_kitchen: { name:"Stainless Built-In Grill 4-Burner", retailer:"Home Depot", link:hdLink("stainless built-in grill 4 burner outdoor"), earn:"2–8%" },
  landscape_beds:  { name:"Black Landscape Edging 20ft Roll", retailer:"Lowe's", link:lowesLink("black landscape edging 20ft"), earn:"1–4%" },
  fence:           { name:"Pool Safety Fence 4ft x 12ft Panel", retailer:"Amazon", link:amazonLink("B07SAFEFNC"), earn:"3–8%" },
  putting_green:   { name:"Artificial Putting Green Turf 5x10", retailer:"Amazon", link:amazonLink("B09PUTTGRN"), earn:"3–8%" },
  sport_court:     { name:"Sport Court Flooring Tile 20-pack", retailer:"Amazon", link:amazonLink("B08SRTCRTF"), earn:"3–8%" },
  bocce:           { name:"Bocce Ball Set Professional 8-ball", retailer:"Amazon", link:amazonLink("B07BOCCEST"), earn:"3–8%" },
};

const ENTRY_FEATURES = [
  { id:"beach_entry", label:"Beach Entry", icon:"🏖️", desc:"Zero-depth gradual slope entry — resort style", color:"#f59e0b" },
  { id:"baja_shelf", label:"Baja Shelf / Tanning Ledge", icon:"☀️", desc:"Shallow ledge 6-12 inches deep, perfect for loungers", color:"#06b6d4" },
  { id:"steps_corner", label:"Corner Steps", icon:"🔢", desc:"Classic corner entry steps with handrail option", color:"#8b5cf6" },
  { id:"steps_end", label:"End Steps", icon:"⬆️", desc:"Full-width steps at shallow end", color:"#3b82f6" },
  { id:"steps_curved", label:"Curved / Roman Steps", icon:"🔵", desc:"Elegant curved steps — traditional style", color:"#10b981" },
  { id:"swim_up_bar", label:"Swim-Up Bar / Ledge", icon:"🍹", desc:"Raised bar area with seating in the water", color:"#ef4444" },
  { id:"grotto", label:"Grotto / Cave", icon:"🏔️", desc:"Rock waterfall with hidden grotto underneath", color:"#64748b" },
  { id:"infinity_edge", label:"Infinity / Vanishing Edge", icon:"🌊", desc:"Water spills over one edge — luxury statement", color:"#0ea5e9" },
  { id:"spa_attached", label:"Attached Spa / Hot Tub", icon:"🛁", desc:"Spillover spa connected to pool", color:"#a855f7" },
  { id:"splash_pad", label:"Splash Pad Zone", icon:"💦", desc:"Zero-depth play area for kids", color:"#22c55e" },
  { id:"diving_rock", label:"Diving Rock / Board", icon:"🪨", desc:"Natural rock or diving board platform", color:"#f97316" },
  { id:"sun_shelf_umbrella", label:"Sun Shelf w/ Umbrella Sleeve", icon:"⛱️", desc:"Tanning ledge with built-in umbrella socket", color:"#eab308" },
];

const POOL_SHAPES = [
  { id:"rectangle", label:"Rectangle", icon:"▬", desc:"Classic, maximizes swim lanes" },
  { id:"oval", label:"Oval / Kidney", icon:"⬭", desc:"Organic shape, popular residential" },
  { id:"lshape", label:"L-Shape", icon:"⌐", desc:"Separate deep & shallow zones" },
  { id:"freeform", label:"Freeform", icon:"〜", desc:"Custom natural flowing shape" },
  { id:"lap", label:"Lap Pool", icon:"━", desc:"Long & narrow for fitness swimming" },
  { id:"greek", label:"Greek / Roman", icon:"🏛️", desc:"Classic rectangular with curved ends" },
  { id:"figure8", label:"Figure 8", icon:"∞", desc:"Two connected circular areas" },
];
const POOL_FINISHES = [
  { id:"plaster", label:"Plaster", desc:"Classic white, most affordable" },
  { id:"pebble", label:"Pebble Tec", desc:"Durable aggregate, natural look" },
  { id:"quartz", label:"Quartz", desc:"Mid-range, smooth & colorful" },
  { id:"tile", label:"All Tile", desc:"Premium, endless color options" },
  { id:"fiberglass", label:"Fiberglass", desc:"Fastest install, low maintenance" },
  { id:"glass_bead", label:"Glass Bead", desc:"Sparkling luxe finish" },
];
const POOL_COLORS = [
  { id:"arctic", label:"Arctic White", hex:"#e8f4f8" },
  { id:"caribbean", label:"Caribbean Blue", hex:"#0ea5e9" },
  { id:"tahoe", label:"Tahoe Blue", hex:"#1d4ed8" },
  { id:"midnight", label:"Midnight Black", hex:"#1e293b" },
  { id:"seafoam", label:"Seafoam Green", hex:"#34d399" },
  { id:"sandstone", label:"Sandstone", hex:"#d4a76a" },
  { id:"slate", label:"Slate Grey", hex:"#64748b" },
  { id:"sapphire", label:"Sapphire", hex:"#2563eb" },
];
const DEPTHS = [
  { id:"shallow", label:"All Shallow (3-4 ft)", avg:3.5, desc:"Best for families & Baja shelves" },
  { id:"standard", label:"Standard (3.5 / 5 ft)", avg:4.25, desc:"Most common residential" },
  { id:"deep", label:"Standard Deep (3.5 / 6 ft)", avg:4.75, desc:"Better for diving" },
  { id:"diving", label:"Diving (4 / 8 ft)", avg:6, desc:"Required for boards & rocks" },
];
const HARDSCAPE_OPTIONS = [
  { id:"concrete_deck", label:"Concrete Deck", icon:"🪵", unit:"sq ft" },
  { id:"travertine", label:"Travertine Pavers", icon:"🟫", unit:"sq ft" },
  { id:"cool_deck", label:"Kool Deck / Textured", icon:"🔲", unit:"sq ft" },
  { id:"wood_composite", label:"Composite Decking", icon:"🪵", unit:"sq ft" },
  { id:"fire_pit", label:"Fire Pit", icon:"🔥", unit:"unit" },
  { id:"fire_bowls", label:"Fire Bowls", icon:"🏺", unit:"qty" },
  { id:"pergola", label:"Pergola / Shade", icon:"🏠", unit:"unit" },
  { id:"retaining_wall", label:"Retaining Wall", icon:"🧱", unit:"linear ft" },
  { id:"outdoor_kitchen", label:"Outdoor Kitchen", icon:"🍳", unit:"unit" },
  { id:"landscape_beds", label:"Planting Beds", icon:"🌿", unit:"sq ft" },
  { id:"fence", label:"Pool Safety Fence", icon:"🚧", unit:"linear ft" },
  { id:"putting_green", label:"Putting Green", icon:"⛳", unit:"sq ft" },
  { id:"sport_court", label:"Sport Court", icon:"🏀", unit:"sq ft" },
  { id:"bocce", label:"Bocce Ball Court", icon:"🎯", unit:"unit" },
];

const PENTAIR_AMAZON = {
  pump_1_5hp:"B0C3JNRWMN", pump_3hp:"B0CY8RB8Q3", pump_touchscreen:"B0F85WWPRV",
  filter_cc320:"B00004RA8N", filter_triton:"B00004RAQN", filter_fns60:"B00004RB0O",
  heater_250:"B000BKRGX4", heater_400:"B000BKRGY8",
  intellicenter:"B09RKKC13Y", intellibrite:"B01HIOVHGI",
  ic40_cell:"B001DSLLH4", ic40_bundle:"B006H3X33A", chlorinator:"B00004RA7E",
  booster:"B0C3JNRWMN",
};
function getPentairEquipment(gallons, extras) {
  // Pump sizing: industry standard = turn over pool volume in 8 hours
  // Flow rate needed (GPM) = gallons / 480 minutes
  const gpm = Math.ceil(gallons / 480);
  const pump = gallons <= 15000
    ? { model:"Pentair IntelliFlo3 VSF 1.5HP", sku:"011065", asin:PENTAIR_AMAZON.pump_1_5hp, earn:"3-8%",
        note:`Sized for your ${gallons.toLocaleString()} gal pool. Needs ~${gpm} GPM turnover — this pump delivers 15-140 GPM variable. Wi-Fi + app control. 90% energy savings vs single-speed.` }
    : gallons <= 30000
    ? { model:"Pentair IntelliFlo3 VSF 3HP", sku:"011076", asin:PENTAIR_AMAZON.pump_3hp, earn:"3-8%",
        note:`Your ${gallons.toLocaleString()} gal pool needs ~${gpm} GPM — the 3HP handles up to 30,000 gal comfortably. Built-in I/O relay board for automation integration.` }
    : { model:"Pentair IntelliFlo3 VSF 3HP (×2)", sku:"011076x2", asin:PENTAIR_AMAZON.pump_3hp, earn:"3-8%",
        note:`At ${gallons.toLocaleString()} gal your pool needs ~${gpm} GPM. Two 3HP VSF pumps in parallel deliver the required flow while maintaining efficiency and redundancy.` };

  // Filter sizing: sq ft of filter area should be ≥ (GPM / 0.375) for cartridge
  const filterSqFt = Math.ceil(gpm / 0.375);
  const filter = gallons <= 15000
    ? { model:"Pentair Clean & Clear Plus 320", sku:"160340", asin:PENTAIR_AMAZON.filter_cc320, earn:"3-8%",
        note:`320 sq ft cartridge filter — right-sized for up to 20,000 gal. No backwash needed, easy quarterly cleaning. Holds debris well between cleanings.` }
    : gallons <= 25000
    ? { model:"Pentair Triton II TR-60 Sand", sku:"140210", asin:PENTAIR_AMAZON.filter_triton, earn:"3-8%",
        note:`High-flow sand filter rated for your flow range (~${gpm} GPM). Simple backwash cleaning. Recommended for pools with heavy bather load or nearby trees.` }
    : { model:"Pentair FNS Plus 60 DE Filter", sku:"180010", asin:PENTAIR_AMAZON.filter_fns60, earn:"3-8%",
        note:`60 sq ft DE filter — finest filtration available, down to 3-5 microns. Best water clarity for your ${gallons.toLocaleString()} gal pool. Backwash every 4-6 weeks.` };

  // Heater sizing: BTU needed ≈ surface area × temp rise × 12
  const surfaceArea = Math.round(gallons / (4.25 * 7.48)); // approx sq ft
  const btuNeeded = surfaceArea * 20 * 12; // 20°F rise, 12 BTU/hr/sq ft
  const heater = extras.heater
    ? gallons <= 15000
      ? { model:"Pentair MasterTemp 250K BTU Gas", sku:"460736", asin:PENTAIR_AMAZON.heater_250, earn:"3-8%",
          note:`Your ~${surfaceArea} sq ft pool needs ~${Math.round(btuNeeded/1000)}K BTU. The 250K handles pools up to 15,000 gal efficiently. Heats ~1°F/hr in moderate conditions.` }
      : { model:"Pentair MasterTemp 400K BTU Gas", sku:"460805", asin:PENTAIR_AMAZON.heater_400, earn:"3-8%",
          note:`At ${gallons.toLocaleString()} gal you need high BTU output. The 400K is the industry workhorse — heats your pool in 2-4 hours from cold. Most popular heater in US.` }
    : null;

  const automation = {
    model:"Pentair IntelliCenter i8PS Bundle", sku:"521903", asin:PENTAIR_AMAZON.intellicenter, earn:"3-8%",
    note:`Controls your pump, lights, heater, and salt system from anywhere via the Pentair Home app. Required for full variable-speed pump efficiency programming. Includes IC40 salt cell.`
  };

  const lightQty = gallons <= 20000 ? 1 : gallons <= 40000 ? 2 : 3;
  const lighting = {
    model:`Pentair IntelliBrite 5G Color LED (×${lightQty})`, sku:"640132", asin:PENTAIR_AMAZON.intellibrite, earn:"3-8%",
    qty: lightQty,
    note:`${lightQty} light${lightQty>1?"s":""} recommended for your ${gallons.toLocaleString()} gal pool${lightQty>1?" — one at each end for even coverage":""}. 16M colors, app controlled, 5-yr warranty. 75% less energy than incandescent.`
  };

  const salt = extras.sanitization === "salt"
    ? { model:"Pentair IntelliChlor IC40 + Power Center", sku:"520555+520556", asin:PENTAIR_AMAZON.ic40_bundle, earn:"3-8%",
        note:`IC40 handles up to 40,000 gal — perfect for your ${gallons.toLocaleString()} gal pool. Self-cleaning cell. Included with IntelliCenter bundle above. Eliminates chlorine purchasing.` }
    : { model:"Pentair Rainbow 320 Inline Chlorinator", sku:"R171096", asin:PENTAIR_AMAZON.chlorinator, earn:"3-8%",
        note:`Traditional inline tablet chlorinator. Reliable, simple, low cost to operate. Holds 9 lbs of 3-inch tablets. Good alternative if you prefer not using a salt system.` };

  const boost = extras.waterFeature
    ? { model:"Pentair IntelliFlo VSF Booster Pump", sku:"011065B", asin:PENTAIR_AMAZON.booster, earn:"3-8%",
        note:`Dedicated pump for water features, deck jets, scuppers, or bubblers. Keeps your main pump optimized for filtration while the booster handles feature flow separately.` }
    : null;

  return [
    { label:"🔄 Pump", ...pump },
    { label:"🧹 Filter", ...filter },
    { label:"🎛️ Automation", ...automation },
    { label:"💡 Lighting", ...lighting },
    { label:"🧂 Sanitization", ...salt },
    ...(heater ? [{ label:"🔥 Heater", ...heater }] : []),
    ...(boost  ? [{ label:"💧 Feature Pump", ...boost }] : []),
  ];
}

// Verified Amazon ASINs (checked against live listings) - direct product links.
const HAYWARD_AMAZON = {
  pump_2_7hp:"B07SQ2MVDN",
  filter_c3030:"B07SS4JCY3", filter_c4030:"B07SPM17GD", filter_de6020:"B07SQ2MDQ2",
  heater_150:"B07SQ2MDQG", heater_400:"B07SQ2MDQQ",
  omnilogic:"B00ZSA1NZI", colorlogic:"B07SPM16VM",
  aquarite_25k:"B07ST63P4W", booster:"B07SPM255G",
};

function getHaywardEquipment(gallons, extras) {
  const gpm = Math.ceil(gallons / 480);
  const pump = gallons <= 15000
    ? { model:"Hayward TriStar VS900 1.85HP", sku:"W3SP3202VSP", query:"Hayward TriStar VS 1.85 HP Variable Speed Pool Pump W3SP3202VSP", earn:"3-8%",
        note:`Sized for your ${gallons.toLocaleString()} gal pool. Needs ~${gpm} GPM turnover — permanent-magnet variable-speed motor, up to 90% energy savings vs single-speed.` }
    : gallons <= 30000
    ? { model:"Hayward TriStar VS950 2.7HP", sku:"W3SP3206VSP", asin:HAYWARD_AMAZON.pump_2_7hp, earn:"3-8%",
        note:`Your ${gallons.toLocaleString()} gal pool needs ~${gpm} GPM — the 2.7HP delivers up to 160 GPM at 40ft head, comfortable for pools up to 30,000 gal.` }
    : { model:"Hayward TriStar VS950 2.7HP (×2)", sku:"W3SP3206VSP×2", asin:HAYWARD_AMAZON.pump_2_7hp, earn:"3-8%",
        note:`At ${gallons.toLocaleString()} gal your pool needs ~${gpm} GPM. Two 2.7HP VS pumps in parallel deliver the required flow with efficiency and redundancy.` };

  const filter = gallons <= 15000
    ? { model:"Hayward SwimClear C3030", sku:"W3C3030", asin:HAYWARD_AMAZON.filter_c3030, earn:"3-8%",
        note:`325 sq ft multi-element cartridge filter. No backwash needed, long filter cycles between cleanings.` }
    : gallons <= 25000
    ? { model:"Hayward SwimClear C4030", sku:"W3C4030", asin:HAYWARD_AMAZON.filter_c4030, earn:"3-8%",
        note:`425 sq ft cartridge filter rated for your flow range (~${gpm} GPM). Top-manifold design for even flow across the full cartridge surface.` }
    : { model:"Hayward ProGrid DE6020", sku:"W3DE6020", asin:HAYWARD_AMAZON.filter_de6020, earn:"3-8%",
        note:`60 sq ft DE filter, filters to 3-5 microns — the clearest water available for your ${gallons.toLocaleString()} gal pool. Backwash every 4-6 weeks.` };

  const surfaceArea = Math.round(gallons / (4.25 * 7.48));
  const btuNeeded = surfaceArea * 20 * 12;
  const heater = extras.heater
    ? gallons <= 15000
      ? { model:"Hayward Universal H150FDN 150K BTU Gas", sku:"W3H150FDN", asin:HAYWARD_AMAZON.heater_150, earn:"3-8%",
          note:`Your ~${surfaceArea} sq ft pool needs ~${Math.round(btuNeeded/1000)}K BTU. The H150 covers pools up to roughly 400 sq ft of surface area efficiently.` }
      : { model:"Hayward Universal H400FDN 400K BTU Gas", sku:"W3H400FDN", asin:HAYWARD_AMAZON.heater_400, earn:"3-8%",
          note:`At ${gallons.toLocaleString()} gal you need high BTU output. The H400 covers pools up to roughly 1,400 sq ft, cupro-nickel heat exchanger rated for salt systems.` }
    : null;

  const automation = {
    model:"Hayward OmniLogic Automation System", sku:"HLBASE", asin:HAYWARD_AMAZON.omnilogic, earn:"3-8%",
    note:`Controls pump, heater, and lighting from the OmniLogic app, with 4 relays expandable to 20. Pairs with AquaRite salt systems and ColorLogic lights for full backyard control.`
  };

  const lightQty = gallons <= 20000 ? 1 : gallons <= 40000 ? 2 : 3;
  const lighting = {
    model:`Hayward ColorLogic 4.0 LED (×${lightQty})`, sku:"W3SP0527LED100", asin:HAYWARD_AMAZON.colorlogic, earn:"3-8%",
    qty: lightQty,
    note:`${lightQty} light${lightQty>1?"s":""} recommended for your ${gallons.toLocaleString()} gal pool${lightQty>1?" — one at each end for even coverage":""}. Networked color LED, 100ft cord.`
  };

  const salt = extras.sanitization === "salt"
    ? { model:"Hayward AquaRite Salt Chlorine Generator", sku:"W3AQR9", asin:HAYWARD_AMAZON.aquarite_25k, earn:"3-8%",
        note:`Complete system rated up to 25,000 gal, includes TurboCell salt cell. Self-cleaning cell, eliminates chlorine purchasing.` }
    : { model:"Hayward Off-Line Chlorinator", sku:"CL220", query:"Hayward CL220 Off-Line Chlorinator", earn:"3-8%",
        note:`Traditional inline tablet chlorinator. Reliable, simple, low cost to operate - a straightforward alternative if you'd rather not run a salt system.` };

  const boost = extras.waterFeature
    ? { model:"Hayward 0.75HP Booster Pump", sku:"W36060", asin:HAYWARD_AMAZON.booster, earn:"3-8%",
        note:`Dedicated pump for water features, deck jets, scuppers, or bubblers. Keeps your main pump optimized for filtration while the booster handles feature flow separately.` }
    : null;

  return [
    { label:"🔄 Pump", ...pump },
    { label:"🧹 Filter", ...filter },
    { label:"🎛️ Automation", ...automation },
    { label:"💡 Lighting", ...lighting },
    { label:"🧂 Sanitization", ...salt },
    ...(heater ? [{ label:"🔥 Heater", ...heater }] : []),
    ...(boost  ? [{ label:"💧 Feature Pump", ...boost }] : []),
  ];
}

// Jandy (Zodiac) has thin direct-Amazon-listing coverage for complete systems -
// every item here links out to an Amazon search instead of a guessed ASIN.
function getJandyEquipment(gallons, extras) {
  const gpm = Math.ceil(gallons / 480);
  const pump = gallons <= 15000
    ? { model:"Jandy VS FloPro 1.65HP", sku:"VSFHP165", query:"Jandy VS FloPro 1.65 HP Variable Speed Pool Pump", earn:"3-8%",
        note:`Sized for your ${gallons.toLocaleString()} gal pool. Needs ~${gpm} GPM turnover — permanent-magnet DC motor engineered to run cooler and last longer at low speeds.` }
    : gallons <= 30000
    ? { model:"Jandy VS FloPro 2.7HP", sku:"VSFHP270", query:"Jandy VS FloPro 2.7 HP Variable Speed Pool Pump", earn:"3-8%",
        note:`Your ${gallons.toLocaleString()} gal pool needs ~${gpm} GPM — the 2.7HP is built for large pools and spas with waterfalls, jets, or in-floor cleaning.` }
    : { model:"Jandy VS FloPro 3.8HP", sku:"VSFHP380", query:"Jandy VS FloPro 3.8 HP Variable Speed Pool Pump", earn:"3-8%",
        note:`At ${gallons.toLocaleString()} gal your pool needs ~${gpm} GPM. The 3.8HP is Jandy's largest single VS pump, built for the highest head pressure and flow demands.` };

  const filter = gallons <= 15000
    ? { model:"Jandy CS150 Cartridge Filter", sku:"CS150", query:"Jandy Pro Series CS150 Cartridge Pool Filter", earn:"3-8%",
        note:`150 sq ft single-element cartridge filter - compact, no backwash needed, easy to clean.` }
    : gallons <= 25000
    ? { model:"Jandy CS250 Cartridge Filter", sku:"CS250", query:"Jandy Pro Series CS250 Cartridge Pool Filter", earn:"3-8%",
        note:`250 sq ft cartridge filter rated for your flow range (~${gpm} GPM). Dependable year-round operation in a compact body.` }
    : { model:"Jandy CV460 Cartridge Filter", sku:"CV460", query:"Jandy CV460 Cartridge Pool Filter 460 sq ft", earn:"3-8%",
        note:`460 sq ft cartridge filter with Versa Plumb fittings for high flow. Right-sized for your ${gallons.toLocaleString()} gal pool.` };

  const surfaceArea = Math.round(gallons / (4.25 * 7.48));
  const btuNeeded = surfaceArea * 20 * 12;
  const heater = extras.heater
    ? gallons <= 15000
      ? { model:"Jandy JXi260 260K BTU Gas Heater", sku:"JXI260N", query:"Jandy JXi260 Natural Gas Pool Heater 260000 BTU", earn:"3-8%",
          note:`Your ~${surfaceArea} sq ft pool needs ~${Math.round(btuNeeded/1000)}K BTU. The JXi260 is ultra-compact with an 84% thermal efficiency rating.` }
      : { model:"Jandy JXiQ400 400K BTU Gas Heater", sku:"JXIQ400N", query:"Jandy JXiQ400 Natural Gas Pool Heater 400000 BTU", earn:"3-8%",
          note:`At ${gallons.toLocaleString()} gal you need high BTU output. The JXiQ400 is the current 400K flagship, replacing the earlier JXi400.` }
    : null;

  const automation = {
    model:"Jandy iAquaLink Automation System", sku:"IQ900-2A", query:"Jandy AquaLink iAquaLink Pool Automation System", earn:"3-8%",
    note:`Controls pump, heater, and lighting from anywhere with the free iAquaLink app. Required for full variable-speed pump efficiency scheduling.`
  };

  const lightQty = gallons <= 20000 ? 1 : gallons <= 40000 ? 2 : 3;
  const lighting = {
    model:`Jandy WaterColors LED Pool Light (×${lightQty})`, sku:"JLU4C24W100", query:"Jandy WaterColors LED Pool Light", earn:"3-8%",
    qty: lightQty,
    note:`${lightQty} light${lightQty>1?"s":""} recommended for your ${gallons.toLocaleString()} gal pool${lightQty>1?" — one at each end for even coverage":""}. Color-changing LED, works with the iAquaLink app.`
  };

  const salt = extras.sanitization === "salt"
    ? { model:"Jandy AquaPure Salt Chlorine Generator", sku:"APURE1400", query:"Jandy AquaPure Salt Chlorine Generator", earn:"3-8%",
        note:`Complete salt system rated up to 40,000 gal. Self-cleaning cell, eliminates chlorine purchasing. Pairs with iAquaLink for remote monitoring.` }
    : { model:"Jandy Pro Series Chlorinator", sku:"CL340", query:"Jandy Pro Series Off-Line Chlorinator", earn:"3-8%",
        note:`Traditional inline tablet chlorinator. Reliable, simple, low cost to operate - a straightforward alternative if you'd rather not run a salt system.` };

  const boost = extras.waterFeature
    ? { model:"Jandy Booster Pump", sku:"JBP075", query:"Jandy Booster Pump water features", earn:"3-8%",
        note:`Dedicated pump for water features, deck jets, scuppers, or bubblers. Keeps your main pump optimized for filtration while the booster handles feature flow separately.` }
    : null;

  return [
    { label:"🔄 Pump", ...pump },
    { label:"🧹 Filter", ...filter },
    { label:"🎛️ Automation", ...automation },
    { label:"💡 Lighting", ...lighting },
    { label:"🧂 Sanitization", ...salt },
    ...(heater ? [{ label:"🔥 Heater", ...heater }] : []),
    ...(boost  ? [{ label:"💧 Feature Pump", ...boost }] : []),
  ];
}

const EQUIPMENT_BRANDS = [
  { id:"pentair", label:"Pentair", getEquipment:getPentairEquipment },
  { id:"hayward", label:"Hayward", getEquipment:getHaywardEquipment },
  { id:"jandy", label:"Jandy", getEquipment:getJandyEquipment },
];

function calcMaterials(shape,len,wid,depthId,finishId) {
  len = Number.isFinite(len) && len > 0 ? len : 1;
  wid = Number.isFinite(wid) && wid > 0 ? wid : 1;
  const sf={rectangle:1,oval:0.79,lshape:0.75,freeform:0.85,lap:1,greek:1,figure8:0.78}[shape]||1;
  const avgDepth={shallow:3.5,standard:4.25,deep:4.75,diving:6}[depthId]||4.25;
  const footprint=len*wid*sf;
  const gallons=Math.round(footprint*avgDepth*7.48);
  const shell=footprint+2*(len+wid)*avgDepth*sf;
  const STICK_FT=20,SPACING=1;
  const floorBarsLong=Math.ceil((len*sf)/SPACING)+1;
  const floorBarsShort=Math.ceil((wid*sf)/SPACING)+1;
  const floorLinFt=(floorBarsLong*wid*sf)+(floorBarsShort*len*sf);
  const perimFt=2*(len+wid)*sf;
  const wallHorizBars=Math.ceil(avgDepth/SPACING)+1;
  const wallVertBars=Math.ceil(perimFt/SPACING)+1;
  const wallLinFt=(wallHorizBars*perimFt)+(wallVertBars*avgDepth);
  const totalLinFt=Math.round((floorLinFt+wallLinFt)*1.15);
  const totalSticks=Math.ceil(totalLinFt/STICK_FT);
  return {
    gallons,
    excavation:`${Math.round(footprint*avgDepth*1.2/27)} cu yds`,
    gunite:`${Math.round(shell*(4/12)/27)} cu yds`,
    rebar:`${totalSticks.toLocaleString()} sticks (${totalLinFt.toLocaleString()} linear ft)`,
    rebarSticks:totalSticks, rebarLinFt:totalLinFt,
    gravel:`${Math.round(footprint*(4/12)/27*1.5)} tons`,
    plumbing:`${Math.round((len+wid)*2.5)} linear ft`,
    coping:`${Math.round(2*(len+wid)*sf+10)} linear ft`,
    tile:`${Math.round(2*(len+wid)*sf+10)} sq ft`,
    finish:`${Math.round(shell)} sq ft`,
    finishSqFt: shell, // raw floor+walls surface area (sq ft) - same value the "finish" string above is derived from
  };
}

const STEP_GUIDE=[
  {phase:"Phase 1",title:"Planning & Permits",icon:"📋",days:"2-4 wks",steps:["Survey property & mark utility lines","Submit permit application to county","Order soil test if required","Finalize pool design & dimensions","Approve equipment & finish selections"]},
  {phase:"Phase 2",title:"Excavation",icon:"🚜",days:"1-3 days",steps:["Mark pool outline with marking paint","Excavate to depth + 12 inches extra","Remove all soil from site","Form & compact the sub-base","Inspect excavation before proceeding"]},
  {phase:"Phase 3",title:"Steel & Plumbing",icon:"🔩",days:"3-5 days",steps:["Install rebar grid per engineering specs","Place return & suction plumbing lines","Install main drain with dual outlet VGB cover","Run conduit for lighting & automation","Inspect all rough plumbing & steel"]},
  {phase:"Phase 4",title:"Gunite / Shotcrete",icon:"🏗️",days:"1-2 days",steps:["Wet rebar & forms before shooting","Apply gunite in one continuous pass","Hand-pack trowel all tight areas","Allow 28-day cure minimum","Wet-cure gunite daily for first week"]},
  {phase:"Phase 5",title:"Tile & Coping",icon:"🟦",days:"3-5 days",steps:["Install waterline tile band","Set bond beam coping stones or pavers","Grout all tile and coping joints","Seal coping to deck joint with flexible sealant","Allow full cure before water fill"]},
  {phase:"Phase 6",title:"Decking",icon:"🪵",days:"3-7 days",steps:["Form and pour concrete deck or set pavers","Install expansion joints at pool-deck interface","Apply deck surface coating or sealer","Install any hardscape features","Clean all surfaces"]},
  {phase:"Phase 7",title:"Equipment Install",icon:"⚙️",days:"1-2 days",steps:["Mount pump, filter, heater on equipment pad","Connect all plumbing to equipment","Wire all electrical per local code","Install automation control system","Pressure-test all plumbing lines"]},
  {phase:"Phase 8",title:"Interior Finish & Fill",icon:"💧",days:"2-3 days",steps:["Apply interior plaster, pebble, or quartz","Begin filling immediately after plaster","Brush plaster continuously during first fill","Start-up chemical balance per plasterer specs","Run pump continuously for first 2 weeks"]},
];

const SHOP_CATEGORIES=[
  {id:"tile",label:"Pool Tile",icon:"🟦",products:[
    {name:"Blue Glass Mosaic Waterline Tile 4x4",retailer:"Home Depot",badge:"Best Seller",img:"🟦",link:hdLink("blue glass mosaic pool tile"),earn:"2-8%"},
    {name:"Iridescent Waterline Pool Tile",retailer:"Wayfair",badge:"Top Rated",img:"🔷",link:wayfairLink("iridescent pool tile"),earn:"3-7%"},
    {name:"White Porcelain Pool Tile 6x6",retailer:"Lowe's",badge:"Value",img:"⬜",link:lowesLink("white porcelain pool tile"),earn:"1-4%"},
    {name:"Pebble Tec Stone Pool Finish Kit",retailer:"Amazon",badge:"Premium",img:"🪨",link:amazonLink("B07PBTECEF"),earn:"3-8%"},
  ]},
  {id:"pavers",label:"Pavers",icon:"🧱",products:[
    {name:"Travertine Pool Coping 12x24",retailer:"Home Depot",badge:"Top Pick",img:"🟫",link:hdLink("travertine pool coping"),earn:"2-8%"},
    {name:"Charcoal Concrete Paver 16x16",retailer:"Lowe's",badge:"Budget",img:"⬛",link:lowesLink("concrete paver 16x16"),earn:"1-4%"},
    {name:"Tumbled Travertine Deck Tile",retailer:"Amazon",badge:"Popular",img:"🟤",link:amazonLink("B089TRVTNE"),earn:"3-8%"},
    {name:"Bluestone Pool Deck Slabs",retailer:"Wayfair",badge:"Luxury",img:"🔵",link:wayfairLink("bluestone pool deck slabs"),earn:"3-7%"},
  ]},
  {id:"lighting",label:"Lighting",icon:"💡",products:[
    {name:"Pentair IntelliBrite 5G Color LED",retailer:"Amazon",badge:"Best Seller",img:"🔵",link:amazonLink("B01HIOVHGI"),earn:"3-8%"},
    {name:"Kichler 12V Landscape Path Lights 6-pack",retailer:"Home Depot",badge:"Top Rated",img:"🔆",link:hdLink("kichler landscape path lights"),earn:"2-8%"},
    {name:"Solar Deck Post Cap Lights",retailer:"Amazon",badge:"Easy Install",img:"☀️",link:amazonLink("B08SOLRDC1"),earn:"3-8%"},
    {name:"48ft Patio String Lights LED",retailer:"Wayfair",badge:"Ambiance",img:"✨",link:wayfairLink("patio string lights 48ft"),earn:"3-7%"},
  ]},
  {id:"furniture",label:"Furniture",icon:"🪑",products:[
    {name:"Teak Reclining Sun Lounger Set of 2",retailer:"Wayfair",badge:"Luxury",img:"🪑",link:wayfairLink("teak pool sun lounger set"),earn:"3-7%"},
    {name:"Aluminum Chaise Lounge Stackable",retailer:"Home Depot",badge:"Durable",img:"🛋️",link:hdLink("aluminum chaise lounge pool"),earn:"2-8%"},
    {name:"5-Piece Outdoor Dining Wicker Set",retailer:"Wayfair",badge:"Best Seller",img:"🍽️",link:wayfairLink("5 piece outdoor dining wicker"),earn:"3-7%"},
    {name:"Floating Pool Lounge Chair",retailer:"Amazon",badge:"Fun Pick",img:"🏊",link:amazonLink("B09FLOATCHR"),earn:"3-8%"},
  ]},
  {id:"umbrellas",label:"Shade",icon:"⛱️",products:[
    {name:"9ft Cantilever Offset Umbrella",retailer:"Wayfair",badge:"Top Rated",img:"☂️",link:wayfairLink("9ft cantilever offset patio umbrella"),earn:"3-7%"},
    {name:"Coolaroo Shade Sail 16ft Triangle",retailer:"Home Depot",badge:"Popular",img:"🔺",link:hdLink("coolaroo shade sail 16ft"),earn:"2-8%"},
    {name:"10ft Market Umbrella Solar LED",retailer:"Amazon",badge:"Smart",img:"⛱️",link:amazonLink("B09MKTUMBL"),earn:"3-8%"},
  ]},
  {id:"fire",label:"Fire Features",icon:"🔥",products:[
    {name:"Propane Fire Bowl 30in Concrete",retailer:"Amazon",badge:"Best Seller",img:"🔥",link:amazonLink("B08FIREBWL"),earn:"3-8%"},
    {name:"Natural Gas Fire Pit Table 48in",retailer:"Home Depot",badge:"Premium",img:"🏮",link:hdLink("natural gas fire pit table 48"),earn:"2-8%"},
    {name:"Fire & Water Bowl Combo",retailer:"Wayfair",badge:"Showpiece",img:"🌋",link:wayfairLink("fire water bowl pool"),earn:"3-7%"},
  ]},
  {id:"water_features",label:"Water Features",icon:"💧",products:[
    {name:"Pentair Deck Jet 2-pack",retailer:"Amazon",badge:"Pro Pick",img:"⛲",link:amazonLink("B00DECKJET"),earn:"3-8%"},
    {name:"Sheer Descent Water Curtain 24in",retailer:"Home Depot",badge:"Luxury",img:"💦",link:hdLink("sheer descent water curtain 24"),earn:"2-8%"},
    {name:"Stacked Stone Waterfall Kit",retailer:"Lowe's",badge:"Natural",img:"🪨",link:lowesLink("stacked stone waterfall kit pool"),earn:"1-4%"},
  ]},
  {id:"plants",label:"Landscaping",icon:"🌿",products:[
    {name:"Privacy Arborvitae 4ft Live Tree",retailer:"Home Depot",badge:"Best Seller",img:"🌲",link:hdLink("arborvitae privacy tree 4ft"),earn:"2-8%"},
    {name:"Bird of Paradise Plant Large",retailer:"Amazon",badge:"Tropical",img:"🌺",link:amazonLink("B07BIRDPRD"),earn:"3-8%"},
    {name:"Boxwood Hedge Live Plant 3-pack",retailer:"Amazon",badge:"Classic",img:"🟩",link:amazonLink("B09BOXWOOD3"),earn:"3-8%"},
  ]},
  {id:"safety",label:"Safety",icon:"🚧",products:[
    {name:"Pool Safety Fence 4ft x 12ft Panel",retailer:"Amazon",badge:"Best Seller",img:"🚧",link:amazonLink("B07SAFEFNC"),earn:"3-8%"},
    {name:"Pool Alarm In-Water Wave Sensor",retailer:"Amazon",badge:"Safety Tech",img:"🔔",link:amazonLink("B08POOLALM"),earn:"3-8%"},
    {name:"Pool Handrail Stainless 60in",retailer:"Lowe's",badge:"Code Required",img:"🔩",link:lowesLink("pool handrail stainless 60"),earn:"1-4%"},
  ]},
];

const RETAILER_COLORS = {
  "Home Depot":{bg:"rgba(255,102,0,0.15)",border:"rgba(255,102,0,0.35)",text:"#ff6600"},
  "Lowe's":{bg:"rgba(0,82,165,0.15)",border:"rgba(0,82,165,0.35)",text:"#4d9fff"},
  "Wayfair":{bg:"rgba(122,52,163,0.15)",border:"rgba(122,52,163,0.35)",text:"#c084fc"},
  "Amazon":{bg:"rgba(255,153,0,0.15)",border:"rgba(255,153,0,0.35)",text:"#ff9900"},
};

const NAV_TABS=[
  {id:0,label:"Design",icon:"🏊"},
  {id:13,label:"How It Works",icon:"✨"},
  {id:1,label:"Entry & Features",icon:"🏖️"},
  {id:2,label:"Hardscapes",icon:"🧱"},
  {id:3,label:"Site Plan",icon:"🗺️"},
  {id:4,label:"Materials",icon:"📊"},
  {id:5,label:"Cost Est.",icon:"💰"},
  {id:6,label:"Equipment",icon:"⚙️"},
  {id:12,label:"Schematic",icon:"📐"},
  {id:7,label:"Build Guide",icon:"📋"},
  {id:8,label:"Shop",icon:"🛍️"},
  {id:9,label:"⚡ Quick Render",icon:""},
  {id:10,label:"Build Tracker",icon:"🏗️"},
  {id:11,label:"Settings",icon:"🔧"},
];


// ─── CLOUD STORAGE (Supabase) — optional, falls back to localStorage ─────────
// To activate: create a free project at supabase.com, then paste your
// Project URL and anon public key into the Cloud Sync panel on the Design tab.
// Until configured, everything works exactly as before using localStorage.
let supabaseClient = null;
let supabaseLoadPromise = null;

function getSupabaseConfig() {
  // Use environment variables first (production), fall back to localStorage (dev)
  if (typeof SUPABASE_URL !== "undefined" && SUPABASE_URL) {
    return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
  }
  try {
    return {
      url: localStorage.getItem("pc_supabase_url") || "",
      key: localStorage.getItem("pc_supabase_key") || "",
    };
  } catch { return { url:"", key:"" }; }
}

async function loadSupabase() {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;
  if (supabaseClient) return supabaseClient;
  if (!supabaseLoadPromise) {
    supabaseLoadPromise = (async () => {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        supabaseClient = createClient(url, key);
        return supabaseClient;
      } catch (e) {
        console.error("Supabase load failed", e);
        return null;
      }
    })();
  }
  return supabaseLoadPromise;
}

const SUPABASE_SETUP_SQL = `create table if not exists pool_projects (
  id text primary key,
  name text,
  data jsonb,
  saved_at bigint
);
alter table pool_projects enable row level security;
create policy "public access" on pool_projects for all using (true) with check (true);`;

// Team accounts (Settings -> Team Management). Run this once in the same
// Supabase SQL editor as the Cloud Sync setup above, if you want real
// multi-login Team access instead of just Team billing. Unlike pool_projects
// above, these policies are scoped to auth.uid() - team membership is more
// sensitive than a design draft, so it's worth doing properly from the start.
const TEAM_SETUP_SQL = `create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  seats int not null default 2,
  created_at timestamptz not null default now()
);
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending',
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique(team_id, email)
);
alter table teams enable row level security;
alter table team_members enable row level security;

create policy "owner manages own team" on teams
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "members can view their team" on teams
  for select using (exists (select 1 from team_members where team_members.team_id = teams.id and team_members.user_id = auth.uid()));

create policy "owner manages members" on team_members
  for all using (exists (select 1 from teams where teams.id = team_members.team_id and teams.owner_id = auth.uid()))
  with check (exists (select 1 from teams where teams.id = team_members.team_id and teams.owner_id = auth.uid()));

create policy "members can see their own membership row" on team_members
  for select using (user_id = auth.uid());

create policy "invited users can activate their own pending row" on team_members
  for update
  using (user_id is null and lower(email) = lower(auth.jwt() ->> 'email'))
  with check (user_id = auth.uid() and lower(email) = lower(auth.jwt() ->> 'email'));`;

// Unified project store: tries Supabase first (if configured), else localStorage.
async function listProjects() {
  const sb = await loadSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from("pool_projects").select("*").order("saved_at",{ascending:false}).limit(50);
      if (error) throw error;
      return (data||[]).map(r => ({ ...r.data, id:r.id, name:r.name, savedAt:r.saved_at }));
    } catch (e) { console.error("Supabase list failed, falling back", e); }
  }
  try { return JSON.parse(localStorage.getItem("pc_projects")||"[]"); } catch { return []; }
}

async function saveProjectRecord(project) {
  const sb = await loadSupabase();
  if (sb) {
    try {
      const { error } = await sb.from("pool_projects").upsert({
        id:String(project.id), name:project.name, data:project, saved_at:project.savedAt,
      });
      if (error) throw error;
      return true;
    } catch (e) { console.error("Supabase save failed, falling back to local", e); }
  }
  try {
    const existing = JSON.parse(localStorage.getItem("pc_projects")||"[]");
    const updated = [project, ...existing.filter(p=>p.id!==project.id)].slice(0,20);
    localStorage.setItem("pc_projects", JSON.stringify(updated));
  } catch {}
  return false;
}

async function deleteProjectRecord(id) {
  const sb = await loadSupabase();
  if (sb) {
    try {
      const { error } = await sb.from("pool_projects").delete().eq("id", String(id));
      if (error) throw error;
      return true;
    } catch (e) { console.error("Supabase delete failed, falling back", e); }
  }
  try {
    const existing = JSON.parse(localStorage.getItem("pc_projects")||"[]");
    localStorage.setItem("pc_projects", JSON.stringify(existing.filter(p=>p.id!==id)));
  } catch {}
  return false;
}

function CloudSyncPanel() {
  const [cfg, setCfg] = useState(getSupabaseConfig());
  const [urlInput, setUrlInput] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showSql, setShowSql] = useState(false);
  const connected = !!(cfg.url && cfg.key);

  const save = async () => {
    const url = urlInput.trim(), key = keyInput.trim();
    if (!url || !key) return;
    try { localStorage.setItem("pc_supabase_url", url); localStorage.setItem("pc_supabase_key", key); } catch {}
    supabaseClient = null; supabaseLoadPromise = null;
    setCfg({ url, key }); setUrlInput(""); setKeyInput(""); setTestResult(null);
  };
  const disconnect = () => {
    try { localStorage.removeItem("pc_supabase_url"); localStorage.removeItem("pc_supabase_key"); } catch {}
    supabaseClient = null; supabaseLoadPromise = null;
    setCfg({ url:"", key:"" });
  };
  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      const sb = await loadSupabase();
      if (!sb) throw new Error("Could not initialize client");
      const { error } = await sb.from("pool_projects").select("id").limit(1);
      if (error) throw error;
      setTestResult({ ok:true, msg:"Connected — cloud sync is active." });
    } catch (e) {
      setTestResult({ ok:false, msg:`${e.message || "Connection failed"}. Make sure you ran the setup SQL below.` });
    } finally { setTesting(false); }
  };

  const copySql = () => {
    try { navigator.clipboard.writeText(SUPABASE_SETUP_SQL); } catch {}
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {!connected ? (
        <div style={{background:"linear-gradient(135deg,rgba(34,197,94,0.1),rgba(22,163,74,0.05))",border:"1px solid rgba(34,197,94,0.25)",borderRadius:14,padding:14}}>
          <div style={{fontSize:13,fontWeight:800,color:"#22c55e",marginBottom:6}}>☁️ Activate Cloud Sync</div>
          <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6,marginBottom:10}}>
            Right now your projects only live on this device. Add a free Supabase project to sync across phone, tablet, and desktop — and never lose work when you start a new chat or switch devices.
          </div>
          <div style={{background:"#0f172a",borderRadius:10,padding:12,marginBottom:10}}>
            {["Go to supabase.com and create a free account + new project","In your project: SQL Editor → paste the setup code below → Run","Project Settings → API → copy the Project URL and anon public key","Paste both below"].map((s,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}>
                <span style={{minWidth:18,height:18,borderRadius:"50%",background:"rgba(34,197,94,0.2)",color:"#22c55e",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                <span style={{fontSize:12,color:"#64748b"}}>{s}</span>
              </div>
            ))}
          </div>
          <button onClick={()=>setShowSql(p=>!p)} style={{fontSize:11,color:"#22c55e",background:"none",border:"none",cursor:"pointer",padding:0,marginBottom:showSql?8:0}}>
            {showSql?"▲ Hide setup code":"▼ Show setup SQL code"}
          </button>
          {showSql&&(
            <div style={{marginBottom:10}}>
              <pre style={{background:"#0a0e1a",border:"1px solid #1e293b",borderRadius:8,padding:10,fontSize:10,color:"#86efac",overflowX:"auto",whiteSpace:"pre-wrap",margin:0}}>{SUPABASE_SETUP_SQL}</pre>
              <button onClick={copySql} style={{marginTop:6,padding:"5px 10px",borderRadius:6,background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.25)",color:"#22c55e",fontSize:11,fontWeight:700,cursor:"pointer"}}>📋 Copy SQL</button>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <input type="text" value={urlInput} onChange={e=>setUrlInput(e.target.value)} placeholder="Project URL (https://xxxx.supabase.co)" style={{background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:13,outline:"none"}}/>
            <input type="password" value={keyInput} onChange={e=>setKeyInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()} placeholder="anon public key" style={{background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:13,outline:"none"}}/>
            <button onClick={save} disabled={!urlInput.trim()||!keyInput.trim()} style={{padding:"10px 18px",borderRadius:10,background:urlInput.trim()&&keyInput.trim()?"linear-gradient(135deg,#22c55e,#16a34a)":"#1e293b",border:"none",color:"white",fontWeight:700,fontSize:13,cursor:urlInput.trim()&&keyInput.trim()?"pointer":"not-allowed"}}>Connect</button>
          </div>
          <div style={{marginTop:8,fontSize:11,color:"#64748b"}}>Until connected, projects save to this device only — everything still works, it just won't follow you to other devices.</div>
        </div>
      ) : (
        <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:"#22c55e"}}>✅ Cloud Sync Connected</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:2}}>{cfg.url}</div>
            </div>
            <button onClick={disconnect} style={{padding:"6px 12px",borderRadius:8,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>Disconnect</button>
          </div>
          <button onClick={testConnection} disabled={testing} style={{padding:"8px 14px",borderRadius:8,background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.25)",color:"#06b6d4",fontSize:12,fontWeight:700,cursor:testing?"not-allowed":"pointer"}}>
            {testing?"Testing...":"🔄 Test Connection"}
          </button>
          {testResult&&(
            <div style={{marginTop:8,fontSize:12,color:testResult.ok?"#22c55e":"#ef4444",lineHeight:1.5}}>{testResult.ok?"✅":"⚠️"} {testResult.msg}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── REGRID PARCEL LOOKUP — drop in a real key when ready ─────────────────────
// Sign up at regrid.com to get real parcel data (lot size, zoning, setbacks).
// Until a key is added below, the app uses realistic estimated data so the
// rest of the planning flow works end-to-end.
function getRegridKey() {
  try { return localStorage.getItem("pc_regrid_key") || ""; } catch { return ""; }
}

async function lookupParcel(addr) {
  const REGRID_KEY = getRegridKey();
  if (!REGRID_KEY) {
    return {
      address: addr,
      parcel: `APN-${Math.floor(Math.random()*900000+100000)}`,
      lot_size: `${(Math.random()*0.4+0.15).toFixed(2)} acres`,
      lot_sqft: `${Math.floor(Math.random()*8000+5000).toLocaleString()} sq ft`,
      zoning: "R-1 Single Family Residential",
      setback_front: "20 ft", setback_rear: "10 ft", setback_side: "5 ft",
      pool_setback: "5 ft from property line",
      source: "estimated",
    };
  }
  const encoded = encodeURIComponent(addr);
  const resp = await fetch(`https://app.regrid.com/api/v1/search.json?query=${encoded}&token=${REGRID_KEY}&limit=1`);
  if (!resp.ok) throw new Error("Regrid API error");
  const data = await resp.json();
  const p = data?.results?.[0];
  if (!p) throw new Error("Address not found");
  return {
    address: p.fields?.address || addr,
    parcel:  p.fields?.parcelnumb || "—",
    lot_size: p.fields?.ll_gisacre ? `${Number(p.fields.ll_gisacre).toFixed(2)} acres` : "—",
    lot_sqft: p.fields?.ll_gissqft ? `${Math.round(p.fields.ll_gissqft).toLocaleString()} sq ft` : "—",
    zoning:   p.fields?.zoning_description || p.fields?.zoning || "Residential",
    setback_front: "Verify with county", setback_rear: "Verify with county",
    setback_side: "Verify with county", pool_setback: "Verify with county",
    source: "regrid",
  };
}

function RegridKeyPanel() {
  const [key, setKey] = useState(getRegridKey());
  const [input, setInput] = useState("");
  const save = () => {
    const k = input.trim(); if (!k) return;
    try { localStorage.setItem("pc_regrid_key", k); } catch {}
    setKey(k); setInput("");
  };
  const remove = () => {
    try { localStorage.removeItem("pc_regrid_key"); } catch {}
    setKey("");
  };
  if (key) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:8,marginTop:8}}>
        <div style={{fontSize:11,fontWeight:700,color:"#22c55e"}}>✅ Regrid live parcel data — active</div>
        <button onClick={remove} style={{fontSize:11,color:"#64748b",background:"none",border:"none",cursor:"pointer",padding:"8px 4px",minHeight:36}}>Remove</button>
      </div>
    );
  }
  return (
    <div style={{marginTop:8,padding:"10px 12px",background:"rgba(100,116,139,0.08)",border:"1px dashed #334155",borderRadius:8}}>
      <div style={{fontSize:11,color:"#94a3b8",marginBottom:6}}>Currently using estimated parcel data. Add a Regrid API key (regrid.com) before launch for real lot size, zoning & setbacks.</div>
      <div style={{display:"flex",gap:6}}>
        <input type="password" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()} placeholder="Paste Regrid API key..." style={{flex:1,background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"6px 10px",color:"#e2e8f0",fontSize:11,outline:"none"}}/>
        <button onClick={save} disabled={!input.trim()} style={{padding:"6px 12px",borderRadius:6,background:input.trim()?"rgba(34,197,94,0.15)":"#1e293b",border:"1px solid rgba(34,197,94,0.3)",color:input.trim()?"#22c55e":"#64748b",fontSize:11,fontWeight:700,cursor:input.trim()?"pointer":"not-allowed"}}>Save</button>
      </div>
    </div>
  );
}

// ─── 3D POOL PREVIEW ───────────────────────────────────────────────────────────
// Lightweight hand-rolled 3D renderer (no external libraries) so this works
// reliably anywhere the app is deployed. Orbit with drag, pinch/scroll to zoom.
// Performance: uses requestAnimationFrame + refs for hot state so auto-spin
// and drag never trigger React re-renders — canvas-only updates at display rate.
function Pool3D({ poolLen, poolWid, poolShape, poolColor, depthId, entries, finishId }) {
  const canvasRef = useRef(null);
  // Ref-based hot state: changes here redraw canvas without touching React
  const stateRef = useRef({ rotY:0.6, rotX:0.45, zoom:1, dragging:false });
  const lastPos = useRef({x:0,y:0});
  const rafRef = useRef(null);
  // React state only for control UI (buttons that need to render)
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewMode, setViewMode] = useState("orbit");
  const autoRotateRef = useRef(true);
  const viewModeRef = useRef("orbit");

  const avgDepth = {shallow:3.5,standard:4.25,deep:4.75,diving:6}[depthId]||4.25;
  const shallowD = {shallow:3,standard:3.5,deep:3.5,diving:4}[depthId]||3.5;
  const deepD = {shallow:4,standard:5,deep:6,diving:8}[depthId]||5;
  const hasSpa = !!entries?.spa_attached;

  // Keep refs in sync with UI state changes
  useEffect(()=>{ autoRotateRef.current = autoRotate; },[autoRotate]);
  useEffect(()=>{ viewModeRef.current = viewMode; },[viewMode]);

  const project = useCallback((pt, W, H, ry, rx, z) => {
    let { x, y, z: pz } = pt;
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const x1 = x * cosY - pz * sinY;
    const z1 = x * sinY + pz * cosY;
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    const camDist = 60 / z;
    const scale = camDist / (camDist + z2 + 30);
    return { sx: W/2 + x1 * scale * z, sy: H/2 + y1 * scale * z, depth: z2 };
  }, []);

  // Core draw — reads from refs, never triggers React
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const { rotY, rotX, zoom } = stateRef.current;
    const vm = viewModeRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);

    const sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,"#1a2c42"); sky.addColorStop(1,"#0b1120");
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);

    const ry = vm==="top" ? 0 : vm==="side" ? 1.57 : rotY;
    const rx = vm==="top" ? 1.5 : vm==="side" ? 0.15 : rotX;
    const z = 14 * zoom;

    const safeLen = Number.isFinite(poolLen) && poolLen > 0 ? poolLen : 1;
    const safeWid = Number.isFinite(poolWid) && poolWid > 0 ? poolWid : 1;
    const maxDim = Math.max(safeLen, safeWid, 1);
    const Lh = (safeLen/maxDim) * 9;
    const Wh = (safeWid/maxDim) * 9;
    const deckPad = 4;
    const D = -avgDepth * 0.9;

    const deckCorners = [
      {x:-Lh-deckPad, y:0, z:-Wh-deckPad}, {x:Lh+deckPad, y:0, z:-Wh-deckPad},
      {x:Lh+deckPad, y:0, z:Wh+deckPad}, {x:-Lh-deckPad, y:0, z:Wh+deckPad},
    ];
    const deckProj = deckCorners.map(p=>project(p,W,H,ry,rx,z));
    ctx.fillStyle = "#3a3226";
    ctx.beginPath(); ctx.moveTo(deckProj[0].sx,deckProj[0].sy);
    deckProj.slice(1).forEach(p=>ctx.lineTo(p.sx,p.sy)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 1;
    for(let i=-2;i<=2;i++){
      const a = project({x:i*(Lh+deckPad)/2, y:0, z:-Wh-deckPad}, W,H,ry,rx,z);
      const b = project({x:i*(Lh+deckPad)/2, y:0, z:Wh+deckPad}, W,H,ry,rx,z);
      ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy); ctx.stroke();
    }

    const rimTop = [{x:-Lh,y:0,z:-Wh}, {x:Lh,y:0,z:-Wh}, {x:Lh,y:0,z:Wh}, {x:-Lh,y:0,z:Wh}];
    const rimBottom = rimTop.map(p=>({...p,y:D}));
    const rimTopProj = rimTop.map(p=>project(p,W,H,ry,rx,z));
    const rimBotProj = rimBottom.map(p=>project(p,W,H,ry,rx,z));

    const faces = [];
    for(let i=0;i<4;i++){
      const j=(i+1)%4;
      const avgZ = (rimTopProj[i].depth+rimTopProj[j].depth+rimBotProj[i].depth+rimBotProj[j].depth)/4;
      faces.push({ type:"wall", avgZ, pts:[rimTopProj[i],rimTopProj[j],rimBotProj[j],rimBotProj[i]], shade: 0.55 + (i%2)*0.1 });
    }
    const floorPts = rimBottom.map(p=>project(p,W,H,ry,rx,z));
    const floorAvgZ = floorPts.reduce((s,p)=>s+p.depth,0)/4;
    faces.push({ type:"floor", avgZ:floorAvgZ, pts:floorPts });
    const waterPts = rimTop.map(p=>({...p,y:D*0.06}));
    const waterProj = waterPts.map(p=>project(p,W,H,ry,rx,z));
    const waterAvgZ = waterProj.reduce((s,p)=>s+p.depth,0)/4;
    faces.push({ type:"water", avgZ:waterAvgZ-0.01, pts:waterProj });
    const copingAvgZ = rimTopProj.reduce((s,p)=>s+p.depth,0)/4;
    faces.push({ type:"coping", avgZ:copingAvgZ+0.02, pts:rimTopProj });
    faces.sort((a,b)=>b.avgZ-a.avgZ);

    faces.forEach(f=>{
      ctx.beginPath(); ctx.moveTo(f.pts[0].sx,f.pts[0].sy);
      f.pts.slice(1).forEach(p=>ctx.lineTo(p.sx,p.sy)); ctx.closePath();
      if(f.type==="water"){
        const grad = ctx.createLinearGradient(f.pts[0].sx,f.pts[0].sy,f.pts[2].sx,f.pts[2].sy);
        grad.addColorStop(0, poolColor); grad.addColorStop(1, poolColor+"cc");
        ctx.fillStyle = grad; ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1;
        for(let i=1;i<4;i++){
          const t = i/4;
          const p1={sx:f.pts[0].sx+(f.pts[1].sx-f.pts[0].sx)*t, sy:f.pts[0].sy+(f.pts[1].sy-f.pts[0].sy)*t};
          const p2={sx:f.pts[3].sx+(f.pts[2].sx-f.pts[3].sx)*t, sy:f.pts[3].sy+(f.pts[2].sy-f.pts[3].sy)*t};
          ctx.beginPath(); ctx.moveTo(p1.sx,p1.sy); ctx.lineTo(p2.sx,p2.sy); ctx.stroke();
        }
      } else if(f.type==="coping"){
        ctx.fillStyle="rgba(210,190,160,0.95)"; ctx.fill();
        ctx.strokeStyle="rgba(150,130,100,0.6)"; ctx.lineWidth=1; ctx.stroke();
      } else if(f.type==="floor"){
        const finColors={plaster:"#e8e4dc",pebble:"#9a8b76",quartz:"#c9bfae",tile:"#3b82f6",fiberglass:"#dbeafe",glass_bead:"#a5d8e8"};
        ctx.fillStyle=(finColors[finishId]||"#9a8b76")+"dd"; ctx.fill();
      } else {
        ctx.fillStyle=`rgba(180,200,210,${f.shade})`; ctx.fill();
        ctx.strokeStyle="rgba(0,0,0,0.2)"; ctx.lineWidth=0.5; ctx.stroke();
      }
    });

    if(hasSpa){
      const sx0=Lh*0.55, sz0=-Wh-deckPad*0.4, sw=Lh*0.4, sd=Wh*0.45;
      const spaTop=[{x:sx0,y:0,z:sz0},{x:sx0+sw,y:0,z:sz0},{x:sx0+sw,y:0,z:sz0+sd},{x:sx0,y:0,z:sz0+sd}].map(p=>project(p,W,H,ry,rx,z));
      ctx.beginPath(); ctx.moveTo(spaTop[0].sx,spaTop[0].sy); spaTop.slice(1).forEach(p=>ctx.lineTo(p.sx,p.sy)); ctx.closePath();
      ctx.fillStyle="rgba(124,58,237,0.55)"; ctx.fill(); ctx.strokeStyle="rgba(124,58,237,0.8)"; ctx.stroke();
    }

    ctx.fillStyle="rgba(255,255,255,0.55)"; ctx.font="11px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`${poolLen}' x ${poolWid}' - ${shallowD}'-${deepD}' deep`, W/2, H-12);
  }, [poolLen, poolWid, poolShape, poolColor, avgDepth, hasSpa, finishId, project]);

  // rAF loop: auto-spin mutates ref directly, draws every frame; pauses when not needed
  useEffect(()=>{
    let active = true;
    const loop = () => {
      if (!active) return;
      if (autoRotateRef.current && !stateRef.current.dragging && viewModeRef.current==="orbit") {
        stateRef.current.rotY += 0.006;
      }
      drawFrame();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { active = false; cancelAnimationFrame(rafRef.current); };
  }, [drawFrame]);

  // Redraw on prop changes (shape/color/finish etc.) — draw is already called by rAF loop so this is a no-op most of the time
  useEffect(()=>{ drawFrame(); },[drawFrame]);

  const getPos = (e) => {
    const cx = e.touches?e.touches[0].clientX:e.clientX;
    const cy = e.touches?e.touches[0].clientY:e.clientY;
    return {x:cx,y:cy};
  };
  const onDown = (e) => {
    stateRef.current.dragging = true;
    setAutoRotate(false); autoRotateRef.current = false;
    lastPos.current = getPos(e); e.preventDefault();
  };
  const onMove = (e) => {
    if(!stateRef.current.dragging || viewModeRef.current!=="orbit") return;
    const pos = getPos(e);
    const dx = pos.x - lastPos.current.x, dy = pos.y - lastPos.current.y;
    stateRef.current.rotY += dx * 0.01;
    stateRef.current.rotX = Math.max(0.1, Math.min(1.5, stateRef.current.rotX + dy * 0.01));
    lastPos.current = pos;
    e.preventDefault();
  };
  const onUp = () => { stateRef.current.dragging = false; };
  const onWheel = (e) => {
    stateRef.current.zoom = Math.max(0.5, Math.min(2.2, stateRef.current.zoom - e.deltaY * 0.001));
    e.preventDefault();
  };
  const handleZoomBtn = (delta) => { stateRef.current.zoom = Math.max(0.5, Math.min(2.2, stateRef.current.zoom + delta)); };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[{id:"orbit",label:"🔄 Orbit"},{id:"top",label:"⬇️ Top-Down"},{id:"side",label:"➡️ Side"}].map(v=>(
          <button key={v.id} onClick={()=>{setViewMode(v.id); viewModeRef.current=v.id; if(v.id==="orbit"){ setAutoRotate(true); autoRotateRef.current=true; }}} style={{padding:"10px 14px",minHeight:40,borderRadius:8,border:`2px solid ${viewMode===v.id?"#06b6d4":"#334155"}`,background:viewMode===v.id?"rgba(6,182,212,0.1)":"#111827",color:viewMode===v.id?"#06b6d4":"#94a3b8",fontSize:12,fontWeight:700,cursor:"pointer"}}>{v.label}</button>
        ))}
        <button onClick={()=>{ const next=!autoRotate; setAutoRotate(next); autoRotateRef.current=next; }} style={{padding:"10px 14px",minHeight:40,borderRadius:8,border:`2px solid ${autoRotate?"#22c55e88":"#334155"}`,background:autoRotate?"rgba(34,197,94,0.1)":"#111827",color:autoRotate?"#22c55e":"#64748b",fontSize:12,fontWeight:700,cursor:"pointer"}}>{autoRotate?"⏸ Pause Spin":"▶️ Auto-Spin"}</button>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <button onClick={()=>handleZoomBtn(0.15)} style={{width:40,height:40,borderRadius:8,border:"1px solid #334155",background:"#1e293b",color:"#e2e8f0",fontSize:18,fontWeight:700,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
          <button onClick={()=>handleZoomBtn(-0.15)} style={{width:40,height:40,borderRadius:8,border:"1px solid #334155",background:"#1e293b",color:"#e2e8f0",fontSize:18,fontWeight:700,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
        </div>
      </div>
      <div style={{borderRadius:14,overflow:"hidden",border:"2px solid #334155",boxShadow:"0 4px 24px rgba(0,0,0,0.5)"}}>
        <canvas ref={canvasRef} width={560} height={380}
          style={{display:"block",width:"100%",cursor:stateRef.current.dragging?"grabbing":viewMode==="orbit"?"grab":"default",touchAction:"none",background:"#0b1120",willChange:"transform"}}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
          onWheel={onWheel} />
      </div>
      <div style={{fontSize:11,color:"#64748b",textAlign:"center"}}>🖱️ Drag to rotate - Scroll or +/− to zoom - This is a proportional preview, not a construction-grade model</div>
    </div>
  );
}

// ─── SITE PLAN GEOMETRY HELPERS (Mapbox GL + Regrid + Turf.js) ────────────────
function getMapboxToken() {
  try { return localStorage.getItem("pc_mapbox_token") || ""; } catch { return ""; }
}
function setMapboxTokenStorage(token) {
  try {
    if (token) localStorage.setItem("pc_mapbox_token", token);
    else localStorage.removeItem("pc_mapbox_token");
  } catch {}
}

// True-to-scale rectangular pool footprint built from real geographic offsets
// (turf.destination), not screen pixels - it renders at the correct physical
// size at any zoom level instead of being pinned to a fixed px-per-foot ratio.
function buildRectPolygon(center, lengthFt, widthFt, rotationDeg) {
  const halfL = lengthFt / 2, halfW = widthFt / 2;
  const diag = Math.hypot(halfL, halfW);
  const cornerAngle = Math.atan2(halfW, halfL) * 180 / Math.PI;
  const bearings = [
    rotationDeg + cornerAngle,
    rotationDeg + 180 - cornerAngle,
    rotationDeg + 180 + cornerAngle,
    rotationDeg - cornerAngle,
  ];
  const coords = bearings.map(b => turf.destination(center, diag, b, { units: "feet" }).geometry.coordinates);
  coords.push(coords[0]);
  return turf.polygon([coords]);
}

// Builds an inward "buildable envelope" by offsetting each parcel edge inward by
// its own setback distance, then reconstructing the polygon from the
// intersections of consecutive offset edges (standard offset-polygon
// technique - exact for convex parcels, which covers the vast majority of
// residential rectangular lots). The edge nearest the searched address point is
// treated as the house/front-facing edge (Mapbox's geocoded point sits at the
// street-facing side of the lot), the farthest edge as the rear, everything
// else as a side. Falls back to a uniform turf.buffer if the reconstruction
// fails - e.g. for a non-convex or unusually shaped parcel.
function buildSetbackEnvelope(parcelPolygon, refPoint, { houseSetback, rearSetback, sideSetback }) {
  try {
    const ring = parcelPolygon.geometry.coordinates[0];
    const centroid = turf.centroid(parcelPolygon);
    const edges = [];
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i], b = ring[i + 1];
      const mid = turf.midpoint(turf.point(a), turf.point(b));
      const distFromRef = refPoint ? turf.distance(refPoint, mid, { units: "feet" }) : 0;
      edges.push({ a, b, mid, distFromRef });
    }
    if (edges.length < 3) throw new Error("not enough edges");

    let houseIdx = 0, rearIdx = Math.min(2, edges.length - 1);
    if (refPoint) {
      houseIdx = edges.reduce((best, e, i) => (e.distFromRef < edges[best].distFromRef ? i : best), 0);
      rearIdx = edges.reduce((best, e, i) => (e.distFromRef > edges[best].distFromRef ? i : best), 0);
    }

    const offsetLines = edges.map((e, i) => {
      const distFt = i === houseIdx ? houseSetback : i === rearIdx ? rearSetback : sideSetback;
      const line = turf.lineString([e.a, e.b]);
      if (!distFt || distFt <= 0) return line;
      let offset = turf.lineOffset(line, distFt, { units: "feet" });
      const offMid = turf.midpoint(turf.point(offset.geometry.coordinates[0]), turf.point(offset.geometry.coordinates[1]));
      const before = turf.distance(e.mid, centroid, { units: "feet" });
      const after = turf.distance(offMid, centroid, { units: "feet" });
      if (after >= before) offset = turf.lineOffset(line, -distFt, { units: "feet" });
      return offset;
    });

    // Extend each offset edge well beyond the parcel so neighboring edges
    // reliably intersect even after a large inward shift.
    const extended = offsetLines.map(line => {
      const [p1, p2] = line.geometry.coordinates;
      const bearing = turf.bearing(turf.point(p1), turf.point(p2));
      const ext1 = turf.destination(turf.point(p1), 500, bearing + 180, { units: "feet" });
      const ext2 = turf.destination(turf.point(p2), 500, bearing, { units: "feet" });
      return turf.lineString([ext1.geometry.coordinates, ext2.geometry.coordinates]);
    });

    const n = extended.length;
    const corners = extended.map((line, i) => {
      const prev = extended[(i - 1 + n) % n];
      const hit = turf.lineIntersect(prev, line);
      if (!hit.features.length) throw new Error("no intersection");
      return hit.features[0].geometry.coordinates;
    });
    corners.push(corners[0]);
    return turf.polygon([corners]);
  } catch {
    const minSetback = Math.max(1, Math.min(houseSetback || 5, rearSetback || 5, sideSetback || 5));
    return turf.buffer(parcelPolygon, -minSetback, { units: "feet" });
  }
}

// Fetches the real parcel boundary from Regrid's v2 point-search API (requires
// a user-supplied Regrid key, same BYOK pattern as lookupParcel() above). Falls
// back to a synthesized rectangular parcel centered near the searched point,
// sized from a typical suburban 0.25-acre lot, when no key is set or the call
// fails - matching the app's existing estimated/live data pattern.
async function fetchParcelPolygon(lat, lng) {
  const token = getRegridKey();
  if (token) {
    try {
      const resp = await fetch(`https://app.regrid.com/api/v2/parcels/point?lat=${lat}&lon=${lng}&radius=60&limit=1&token=${token}`);
      if (resp.ok) {
        const data = await resp.json();
        const feature = data?.parcels?.features?.[0];
        if (feature?.geometry) {
          const fields = feature.properties?.fields || {};
          return {
            polygon: turf.feature(feature.geometry),
            attrs: {
              parcel: fields.parcelnumb || "—",
              lot_size: fields.ll_gisacre ? `${Number(fields.ll_gisacre).toFixed(2)} acres` : "—",
              lot_sqft: fields.ll_gissqft ? `${Math.round(fields.ll_gissqft).toLocaleString()} sq ft` : "—",
              zoning: fields.zoning_description || fields.zoning || "Residential",
            },
            source: "regrid",
          };
        }
      }
    } catch {}
  }
  const estSqFt = 10890; // ~0.25 acre typical suburban lot
  const ratio = 4 / 3;
  const estWidthFt = Math.sqrt(estSqFt / ratio);
  const estDepthFt = estSqFt / estWidthFt;
  // Shift the rectangle's center back from the searched point so that point
  // sits near the front edge, matching where a geocoded address typically falls.
  const parcelCenter = turf.destination([lng, lat], estDepthFt / 2, 0, { units: "feet" }).geometry.coordinates;
  const rect = buildRectPolygon(parcelCenter, estDepthFt, estWidthFt, 0);
  return {
    polygon: rect,
    attrs: {
      parcel: "—",
      lot_size: `${(estSqFt / 43560).toFixed(2)} acres (estimated)`,
      lot_sqft: `${estSqFt.toLocaleString()} sq ft (estimated)`,
      zoning: "Estimated — verify with county",
    },
    source: "estimated",
  };
}

// ─── MASK TWEAK PANEL (FLUX Fill inpainting) ──────────────────────────────────
// Lets the user paint over part of an existing render and describe a targeted
// change (e.g. "change the deck to dark slate"), instead of re-rendering the
// whole scene. Reused across all three render surfaces (pool, hardscape, quick).
function MaskTweakPanel({ imageUrl, onTweaked, dailyRenders=0, dailyLimit=10, bumpDailyRender=()=>{} }) {
  const [open, setOpen] = useState(false);
  const [brushSize, setBrushSize] = useState(50);
  const [hasMask, setHasMask] = useState(false);
  const [tweakPrompt, setTweakPrompt] = useState("");
  const [tweaking, setTweaking] = useState(false);
  const [tweakError, setTweakError] = useState(null);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef(null);

  const onImgLoad = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = e.target.naturalWidth;
    canvas.height = e.target.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasMask(false);
  };

  const pointFromEvent = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pt = pointFromEvent(e);
    lastPtRef.current = pt;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(pt.x, pt.y, brushSize / 2, 0, Math.PI * 2); ctx.fill();
    setHasMask(true);
  };

  const moveDraw = (e) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pt = pointFromEvent(e);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = brushSize; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(lastPtRef.current.x, lastPtRef.current.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
    lastPtRef.current = pt;
  };

  const endDraw = () => { drawingRef.current = false; };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasMask(false);
  };

  // Overlay canvas is transparent with opaque white strokes, dimmed via CSS
  // opacity for display - CSS opacity doesn't touch the pixel buffer, so
  // drawing it onto a black-filled canvas here yields a clean binary mask.
  const exportMask = () => {
    const overlay = canvasRef.current;
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = overlay.width;
    maskCanvas.height = overlay.height;
    const mctx = maskCanvas.getContext("2d");
    mctx.fillStyle = "#000";
    mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    mctx.drawImage(overlay, 0, 0);
    return maskCanvas.toDataURL("image/png");
  };

  const applyTweak = async () => {
    if (!hasMask) { setTweakError("Paint over the area you want to change first."); return; }
    if (!tweakPrompt.trim()) { setTweakError("Describe what to change in the painted area."); return; }
    if (dailyRenders >= dailyLimit) { setTweakError(`You've used all ${dailyLimit} renders for today.`); return; }

    setTweaking(true); setTweakError(null);
    try {
      const maskUrl = exportMask();
      const resp = await fetch(`${RENDER_SERVICE_URL}/api/tweak-render`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renderedImageUrl: imageUrl, maskUrl, tweakPrompt: tweakPrompt.trim() }),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        let parsed = {}; try { parsed = JSON.parse(txt); } catch {}
        const msg = parsed?.error || txt.slice(0, 140);
        if (resp.status === 429) throw new Error("Rate limit reached - wait 60 seconds and try again.");
        throw new Error(msg || `Tweak error ${resp.status}`);
      }
      const data = await resp.json();
      if (!data?.url) throw new Error("No image returned - please try again.");
      onTweaked(data.url);
      bumpDailyRender();
      setOpen(false); setTweakPrompt(""); clearMask();
    } catch (err) {
      setTweakError(err.message || "Something went wrong - please try again.");
    } finally {
      setTweaking(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} disabled={dailyRenders >= dailyLimit}
        style={{width:"100%",padding:"12px",borderRadius:10,background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.3)",color:dailyRenders>=dailyLimit?"#475569":"#06b6d4",fontWeight:700,fontSize:13,cursor:dailyRenders>=dailyLimit?"not-allowed":"pointer"}}>
        🖌️ Tweak a Specific Area
      </button>
    );
  }

  return (
    <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
      <div style={{fontSize:12,color:"#94a3b8",marginBottom:8}}>Paint over the area you want changed, then describe the change (e.g. "change travertine deck to dark slate stone").</div>
      <div style={{position:"relative",width:"100%",borderRadius:10,overflow:"hidden",border:"1px solid #334155",lineHeight:0}}>
        <img src={imageUrl} alt="Render to tweak" onLoad={onImgLoad} draggable={false} style={{width:"100%",display:"block"}} />
        <canvas ref={canvasRef}
          onPointerDown={startDraw} onPointerMove={moveDraw} onPointerUp={endDraw} onPointerLeave={endDraw} onPointerCancel={endDraw}
          style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.55,cursor:"crosshair",touchAction:"none"}} />
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
        <span style={{fontSize:11,color:"#64748b",whiteSpace:"nowrap"}}>Brush size</span>
        <input type="range" min="15" max="150" value={brushSize} onChange={e=>setBrushSize(Number(e.target.value))} style={{flex:1}} />
        <button onClick={clearMask} style={{padding:"6px 12px",borderRadius:8,background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",fontSize:11,fontWeight:700,cursor:"pointer"}}>Clear</button>
      </div>
      <textarea value={tweakPrompt} onChange={e=>setTweakPrompt(e.target.value)}
        placeholder={`e.g. "Change travertine deck to dark slate stone"`} rows={2}
        style={{width:"100%",marginTop:10,background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",lineHeight:1.6,fontFamily:"inherit"}} />
      {tweakError && <div style={{fontSize:12,color:"#ef4444",fontWeight:600,marginTop:8}}>⚠️ {tweakError}</div>}
      <div style={{display:"flex",gap:8,marginTop:10}}>
        <button onClick={applyTweak} disabled={tweaking}
          style={{flex:1,padding:"12px",borderRadius:10,background:tweaking?"#1e293b":"linear-gradient(135deg,#06b6d4,#0891b2)",border:"none",color:"white",fontWeight:700,fontSize:13,cursor:tweaking?"not-allowed":"pointer"}}>
          {tweaking ? "⏳ Applying tweak..." : "✨ Apply Tweak"}
        </button>
        <button onClick={() => { setOpen(false); clearMask(); setTweakError(null); }} disabled={tweaking}
          style={{padding:"12px 16px",borderRadius:10,background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",fontWeight:700,fontSize:13,cursor:tweaking?"not-allowed":"pointer"}}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── AI RENDERING COMPONENT ───────────────────────────────────────────────────
function AIRenderingPanel({ bgPhoto, setBgPhoto, shape, poolColor, len, wid, finish, colorId, entries, hardscapes, dailyRenders=0, dailyLimit=10, onRenderComplete=()=>{} }) {
  const [rendering, setRendering] = useState(false);
  const [renderedImage, setRenderedImage] = useState(null);
  const [userTweak, setUserTweak] = useState("");
  const [renderCount, setRenderCount] = useState(() => { try { return parseInt(localStorage.getItem("pc_renders")||"0"); } catch { return 0; } });
  const [monthlyRenders, setMonthlyRenders] = useState(() => { try { return parseInt(localStorage.getItem("pc_month_renders")||"0"); } catch { return 0; } });
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState("photorealistic");
  const [aiDescription, setAiDescription] = useState(null);
  const [queued, setQueued] = useState(false);

  const MONTHLY_LIMIT = 30;
  const activeEntries = ENTRY_FEATURES.filter(e => entries[e.id]);
  const activeHardscapes = HARDSCAPE_OPTIONS.filter(h => hardscapes[h.id]);

  const STYLES = [
    { id:"photorealistic", label:"📷 Photorealistic",  hint:"Natural daylight - most realistic" },
    { id:"twilight",       label:"🌅 Twilight / Dusk",  hint:"Golden hour warm sunset glow" },
    { id:"night",          label:"🌙 Night Lit",         hint:"Dramatic LED pool lighting at night" },
    { id:"aerial",         label:"🚁 Aerial / Drone",    hint:"Overhead bird's-eye perspective" },
    { id:"magazine",       label:"✨ Magazine",          hint:"Luxury design editorial look" },
  ];

  const buildPrompt = () => {
    const finishLabel = POOL_FINISHES.find(f=>f.id===finish)?.label || finish;
    const colorLabel  = POOL_COLORS.find(c=>c.id===colorId)?.label  || colorId;
    const featureList = activeEntries.map(e=>e.label).join(", ");
    const hardList    = activeHardscapes.map(h=>h.label).join(", ");
    const styleMap = {
      photorealistic: "natural daylight, ultra-photorealistic architectural photography, match existing lighting and shadows precisely",
      twilight:       "golden dusk lighting, warm orange-pink sky, cinematic atmosphere, long shadows",
      night:          "nighttime scene, glowing pool LED lights, reflections on water, ambient garden lighting, dark sky",
      aerial:         "drone aerial overhead view, looking straight down, birds-eye perspective, wide angle",
      magazine:       "luxury architectural design magazine, aspirational lifestyle photography, perfectly composed, soft editorial light",
    };
    let p = `Edit this backyard photo to add a realistic ${shape}-shaped swimming pool, ${len} feet long by ${wid} feet wide. The pool has ${colorLabel} crystal clear water with a ${finishLabel} interior finish.`;
    if (featureList) p += ` Include these pool features: ${featureList}.`;
    if (hardList)    p += ` Also add: ${hardList}.`;
    p += ` The pool must look completely natural and permanently built into this exact space - correct perspective, matching ground materials, realistic shadows, proper depth, and realistic water reflections. ${styleMap[selectedStyle]}. Photorealistic result, ultra HD, the pool should look like it was professionally built here years ago.`;
    if (userTweak.trim()) p += ` Additional instructions: ${userTweak.trim()}.`;
    return p;
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file (JPG, PNG, etc)."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Photo is too large (over 8MB). Please use a smaller photo or compress it first."); return; }
    const reader = new FileReader();
    reader.onload = ev => { setBgPhoto(ev.target.result); setRenderedImage(null); setAiDescription(null); setError(null); };
    reader.readAsDataURL(file);
  };

  const getAIDescription = async (prompt) => {
    try {
      const resp = await fetch("/api/describe", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ prompt: `You are a luxury pool designer. In 2-3 enthusiastic sentences, describe this pool design to an excited homeowner: ${prompt.slice(0,300)}` })
      });
      const d = await resp.json();
      return d?.text || null;
    } catch { return null; }
  };

  const handleRender = async () => {
    if (!bgPhoto) { setError("Please upload a backyard photo first. FLUX edits your real photo - it needs to see the actual space."); return; }
    if (dailyLimit <= 0) { setError("AI rendering needs an active Basic or Pro plan - subscribe in Settings to unlock it."); return; }
    if (dailyRenders >= dailyLimit) { setError(`You've used all ${dailyLimit} renders for today - pool and hardscape renders share this limit.`); return; }

    setRendering(true); setQueued(false); setError(null);
    setProgress(0); setProgressMsg("Queuing render request..."); setRenderedImage(null); setAiDescription(null);

    const steps = [
      [8,  "Sending photo to FLUX..."], [20, "FLUX is analyzing your backyard..."],
      [38, "Placing pool at correct perspective..."], [55, "Rendering water, light & reflections..."],
      [70, "Matching shadows & ground texture..."], [84, "Polishing photorealistic details..."], [95, "Almost done..."],
    ];
    let si = 0;
    const interval = setInterval(()=>{ if(si < steps.length){ setProgress(steps[si][0]); setProgressMsg(steps[si][1]); si++; } }, 2800);

    try {
      const b64 = bgPhoto.split(",")[1];
      const mediaType = bgPhoto.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      const prompt = buildPrompt();

      const resp = await fetch(`${RENDER_SERVICE_URL}/api/generate-pool-render`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ prompt, image: { b64_json: b64, media_type: mediaType } }),
      });

      clearInterval(interval);

      if (!resp.ok) {
        const txt = await resp.text().catch(()=>"");
        let parsed = {}; try { parsed = JSON.parse(txt); } catch {}
        const msg = parsed?.error || txt.slice(0,140);
        if (resp.status === 429) { setQueued(true); throw new Error("Rate limit reached - wait 60 seconds and try again."); }
        if (resp.status === 400) throw new Error(`Bad request: ${msg}. Try a smaller photo (under 4MB) or a different image format.`);
        throw new Error(`FLUX API error ${resp.status}: ${msg}`);
      }

      const data = await resp.json();
      const b64Result = data?.b64_json;
      const urlResult = data?.url;
      if (!b64Result && !urlResult) throw new Error("FLUX returned no image. Please try again.");

      setProgress(100); setProgressMsg("Done!");
      const finalImg = b64Result ? `data:image/jpeg;base64,${b64Result}` : urlResult;
      setRenderedImage(finalImg);

      const newTotal = renderCount + 1;
      const newMonthly = monthlyRenders + 1;
      setRenderCount(newTotal); setMonthlyRenders(newMonthly);
      try { localStorage.setItem("pc_renders", newTotal); localStorage.setItem("pc_month_renders", newMonthly); } catch {}

      getAIDescription(prompt).then(d=>setAiDescription(d));
      onRenderComplete();
    } catch(err) {
      clearInterval(interval);
      setError(err.message || "Something went wrong - please try again.");
    } finally { setRendering(false); }
  };

  const handleRefresh = () => { setRenderedImage(null); setAiDescription(null); setError(null); setQueued(false); setTimeout(handleRender, 80); };

  const QUICK_TWEAKS = [
    "tropical palm trees and lush landscaping", "outdoor fire pit with lounge seating", "pergola with climbing vines and shade",
    "outdoor kitchen and wet bar area", "natural rock waterfall cascading in", "string lights for evening ambiance",
    "travertine stone deck and coping", "privacy hedge and mature landscaping", "putting green alongside the pool", "sun shelf with patio umbrella",
  ];

  const finishLink = FINISH_LINKS[finish];
  const colorLink  = COLOR_LINKS[colorId];
  const entryLinks = activeEntries.map(e=>ENTRY_LINKS[e.id]).filter(Boolean);
  const hardLinks  = activeHardscapes.map(h=>HARDSCAPE_LINKS[h.id]).filter(Boolean);
  const allLinks   = [finishLink, colorLink, ...entryLinks, ...hardLinks].filter(Boolean);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:10}}>
          <div><div style={{fontSize:13,fontWeight:800,color:"#22c55e"}}>✅ FLUX AI Rendering</div><div style={{fontSize:12,color:"#64748b",marginTop:2}}>fal.ai's FLUX model photorealistically renders your pool into a real backyard photo.</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[{label:"Renders This Month", val:monthlyRenders, of:MONTHLY_LIMIT, color:"#06b6d4"},{label:"Total Renders", val:renderCount, of:null, color:"#a78bfa"},{label:"Est. API Cost", val:`$${(monthlyRenders*0.07).toFixed(2)}`, of:null, color:"#22c55e"}].map(s=>(
            <div key={s.label} style={{background:"#1e293b",borderRadius:8,padding:"9px 10px",textAlign:"center"}}>
              <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{s.label}</div>
              <div style={{fontSize:17,fontWeight:800,color:s.color}}>{s.val}{s.of?<span style={{fontSize:11,color:"#64748b",fontWeight:400}}> / {s.of}</span>:""}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:12,padding:12}}>
        <div style={{fontSize:11,color:"#f59e0b",fontWeight:700,marginBottom:4}}>⚠️ Fair use applies</div>
        <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>
          Renders run on a shared <strong style={{color:"#e2e8f0"}}>fal.ai</strong> API key (fal.ai/dashboard) - pay per image, no per-user cap on our end. Your plan's daily render limit is what keeps usage fair across customers.
        </div>
      </div>

      <div style={{background:"#0f172a",border:`2px solid ${bgPhoto?"rgba(34,197,94,0.4)":"rgba(6,182,212,0.2)"}`,borderRadius:14,padding:14}}>
        <div style={{fontSize:11,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>📸 Backyard Photo - Required</div>
        <div style={{fontSize:12,color:"#64748b",marginBottom:10}}>FLUX edits your actual photo - the pool is rendered realistically into your real space matching lighting, perspective & shadows. Keep photos under 8MB.</div>
        <div style={{display:"flex",gap:8}}>
          <label style={{flex:1,padding:"13px 0",borderRadius:10,background:bgPhoto?"rgba(34,197,94,0.1)":"rgba(6,182,212,0.08)",border:`1px solid ${bgPhoto?"rgba(34,197,94,0.35)":"rgba(6,182,212,0.2)"}`,color:bgPhoto?"#22c55e":"#06b6d4",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {bgPhoto?"✅ Photo ready - tap to change":"📁 Upload Backyard Photo"}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{display:"none"}} />
          </label>
          <label style={{padding:"13px 18px",borderRadius:10,background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.2)",color:"#06b6d4",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",flexShrink:0}}>
            📷<input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{display:"none"}} />
          </label>
          {bgPhoto&&<button onClick={()=>{setBgPhoto(null);setRenderedImage(null);setError(null);}} style={{padding:"13px 14px",borderRadius:10,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontWeight:700,cursor:"pointer"}}>✕</button>}
        </div>
        {bgPhoto&&(
          <div style={{marginTop:10,borderRadius:10,overflow:"hidden",border:"1px solid rgba(34,197,94,0.3)"}}>
            <img src={bgPhoto} alt="backyard" style={{width:"100%",display:"block",maxHeight:200,objectFit:"cover"}} />
            <div style={{background:"rgba(34,197,94,0.8)",padding:"5px 12px",fontSize:12,color:"white",fontWeight:700}}>✅ Aurora will render your pool into this exact space</div>
          </div>
        )}
      </div>

      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:11,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>🎨 Rendering Style</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {STYLES.map(s=>(
            <button key={s.id} onClick={()=>setSelectedStyle(s.id)}
              style={{textAlign:"left",padding:"10px 14px",borderRadius:10,border:`2px solid ${selectedStyle===s.id?"#7c3aed":"#1e293b"}`,background:selectedStyle===s.id?"rgba(124,58,237,0.08)":"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontWeight:700,fontSize:13,color:selectedStyle===s.id?"#a78bfa":"#e2e8f0"}}>{s.label}</span>
              <span style={{fontSize:11,color:"#64748b"}}>- {s.hint}</span>
              {selectedStyle===s.id&&<span style={{marginLeft:"auto",color:"#a78bfa",fontWeight:800,fontSize:14}}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:11,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>✍️ Tell FLUX What to Add</div>
        <textarea value={userTweak} onChange={e=>setUserTweak(e.target.value)}
          placeholder="e.g. 'add a natural rock waterfall on the left side with tropical palms and a fire pit in the back right corner'" rows={3}
          style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",lineHeight:1.6,fontFamily:"inherit"}} />
        <div style={{marginTop:10}}>
          <div style={{fontSize:10,color:"#64748b",marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>Quick add →</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {QUICK_TWEAKS.map(qt=>(<button key={qt} onClick={()=>setUserTweak(p=>p?p+", "+qt:qt)} style={{padding:"5px 10px",borderRadius:20,border:"1px solid #334155",background:"#1e293b",color:"#94a3b8",fontSize:11,cursor:"pointer"}}>+ {qt}</button>))}
          </div>
        </div>
      </div>

      {dailyLimit <= 0 ? (
        <div style={{background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.25)",borderRadius:14,padding:16,textAlign:"center"}}>
          <div style={{fontSize:16,marginBottom:6}}>🔒</div>
          <div style={{fontSize:14,fontWeight:700,color:"#a78bfa",marginBottom:4}}>Subscribe to Start Rendering</div>
          <div style={{fontSize:12,color:"#94a3b8"}}>AI rendering needs an active Basic or Pro plan - subscribe in Settings to unlock it.</div>
        </div>
      ) : dailyRenders >= dailyLimit && (
        <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:14,padding:16,textAlign:"center"}}>
          <div style={{fontSize:16,marginBottom:6}}>⏰</div>
          <div style={{fontSize:14,fontWeight:700,color:"#ef4444",marginBottom:4}}>Daily Render Limit Reached</div>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:4}}>You've used all {dailyLimit} renders for today - pool and hardscape renders share this limit.</div>
          <div style={{fontSize:11,color:"#64748b"}}>Resets at midnight. Upgrade to Pro in Settings for more daily renders.</div>
        </div>
      )}

      <button onClick={rendering||dailyRenders>=dailyLimit?null:handleRender}
        style={{width:"100%",padding:"17px",borderRadius:12,background:rendering?"#1e293b":"linear-gradient(135deg,#7c3aed,#5b21b6)",
          border:"none",color:"white",fontWeight:800,fontSize:16,cursor:rendering?"not-allowed":"pointer",boxShadow:!rendering?"0 4px 24px rgba(124,58,237,0.35)":"none",letterSpacing:"0.02em",transition:"all 0.2s"}}>
        {rendering ? `⏳ ${progressMsg}` : (renderedImage ? "🔄 Generate New Variation" : "🚀 Generate with FLUX")}
      </button>

      {rendering&&(
        <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12,color:"#a78bfa",fontWeight:600}}>{progressMsg}</span><span style={{fontSize:12,color:"#64748b"}}>{progress}%</span></div>
          <div style={{height:6,background:"#1e293b",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#7c3aed,#a78bfa,#06b6d4)",borderRadius:3,transition:"width 2.5s ease"}} /></div>
          <div style={{marginTop:16,textAlign:"center"}}><div style={{fontSize:36}}>🚀</div><div style={{fontSize:13,color:"#a78bfa",marginTop:6,fontWeight:600}}>FLUX is working on your render...</div><div style={{fontSize:11,color:"#64748b",marginTop:3}}>Photo-realistic results take 20-45 seconds</div></div>
        </div>
      )}

      {error&&!rendering&&(
        <div style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:12,padding:14}}>
          <div style={{fontSize:13,color:"#ef4444",fontWeight:700,marginBottom:8}}>⚠️ {error}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {bgPhoto&&!queued&&<button onClick={handleRefresh} style={{padding:"8px 14px",borderRadius:8,background:"rgba(124,58,237,0.12)",border:"1px solid rgba(124,58,237,0.25)",color:"#a78bfa",fontWeight:700,fontSize:12,cursor:"pointer"}}>🔄 Try Again</button>}
            {queued&&<div style={{fontSize:12,color:"#f59e0b",padding:"8px 0"}}>⏰ Wait 60 seconds then try again.</div>}
          </div>
        </div>
      )}

      {renderedImage&&!rendering&&(
        <div style={{background:"#0f172a",border:"2px solid rgba(124,58,237,0.35)",borderRadius:16,overflow:"hidden",boxShadow:"0 8px 40px rgba(124,58,237,0.18)"}}>
          <div style={{position:"relative"}}>
            <img src={renderedImage} alt="FLUX pool rendering" style={{width:"100%",display:"block"}} />
            <div style={{position:"absolute",top:10,left:10,background:"rgba(124,58,237,0.92)",borderRadius:8,padding:"5px 12px",fontSize:11,color:"white",fontWeight:700}}>🚀 FLUX - Render #{renderCount}</div>
            <div style={{position:"absolute",top:10,right:10,background:"rgba(0,0,0,0.6)",borderRadius:8,padding:"5px 10px",fontSize:10,color:"#94a3b8"}}>Pool Craft Pro</div>
          </div>
          {aiDescription&&(
            <div style={{padding:"14px 16px",background:"rgba(124,58,237,0.06)",borderTop:"1px solid rgba(124,58,237,0.15)"}}>
              <div style={{fontSize:10,color:"#a78bfa",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>🤖 AI Designer Notes</div>
              <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.65,fontStyle:"italic"}}>{aiDescription}</div>
            </div>
          )}
          <div style={{padding:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <button onClick={handleRefresh} style={{padding:"12px",borderRadius:10,background:"rgba(124,58,237,0.12)",border:"1px solid rgba(124,58,237,0.3)",color:"#a78bfa",fontWeight:700,fontSize:13,cursor:"pointer"}}>🔄 New Variation</button>
              <a href={renderedImage} download={`poolcraft-aurora-${renderCount}.jpg`} style={{padding:"12px",borderRadius:10,background:"rgba(34,197,94,0.12)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",fontWeight:700,fontSize:13,textDecoration:"none",textAlign:"center",display:"block"}}>⬇️ Save Image</a>
            </div>
            <div style={{fontSize:11,color:"#334155",textAlign:"center"}}>{len}' x {wid}' {POOL_SHAPES.find(s=>s.id===shape)?.label} - {STYLES.find(s=>s.id===selectedStyle)?.label}</div>
          </div>
        </div>
      )}

      {renderedImage&&!rendering&&(
        <MaskTweakPanel imageUrl={renderedImage} onTweaked={setRenderedImage} dailyRenders={dailyRenders} dailyLimit={dailyLimit} bumpDailyRender={onRenderComplete} />
      )}

      {allLinks.length>0&&(
        <div style={{background:"linear-gradient(135deg,rgba(245,158,11,0.1),rgba(217,119,6,0.05))",border:"1px solid rgba(245,158,11,0.22)",borderRadius:14,padding:14}}>
          <div style={{fontSize:13,fontWeight:800,color:"#f59e0b",marginBottom:10}}>🛒 Shop Everything in This Design</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {allLinks.map((item,i)=>{
              const rc=RETAILER_COLORS[item.retailer]||{bg:"rgba(100,116,139,0.1)",border:"rgba(100,116,139,0.3)",text:"#94a3b8"};
              return(
                <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",borderRadius:10,background:"#111827",border:"1px solid #1e293b",textDecoration:"none",gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div>
                    <div style={{display:"flex",gap:6,marginTop:4,alignItems:"center"}}>
                      <span style={{padding:"2px 8px",borderRadius:20,background:rc.bg,border:`1px solid ${rc.border}`,color:rc.text,fontSize:10,fontWeight:700}}>{item.retailer}</span>
                      <span style={{fontSize:10,color:"#64748b"}}>You earn {item.earn}</span>
                    </div>
                  </div>
                  <span style={{fontSize:18,color:"#f59e0b",flexShrink:0}}>→</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FEATURE CARD ─────────────────────────────────────────────────────────────
const FEATURE_DETAILS = {
  beach_entry:"Beach entry pools have a gradual zero-depth slope that transitions from the pool deck directly into the water. Popular for families with young children and older adults. Requires extra excavation and shotcrete work at the shallow end.",
  baja_shelf:"Also called a tanning ledge or sun shelf. A raised platform of 6-12 inches of water, typically 12-18 inches below the main deck. Chairs and tables sit directly in the water.",
  steps_corner:"Traditional corner entry with 3-4 steps descending into the pool, tucked into one corner of the shallow end. Usually includes a stainless steel handrail.",
  steps_end:"Full-width steps span the entire width of the shallow end. More welcoming and accessible than corner steps. Doubles as a shallow sitting area.",
  steps_curved:"Curved Roman or Grecian steps use sweeping semicircular shapes rather than straight steps. A classic architectural detail that adds elegance and a resort feel.",
  swim_up_bar:"A counter built into the pool edge with submerged barstools so swimmers can sit at chest height in the water. Requires extra plumbing for the bar area.",
  grotto:"A cave or alcove built from natural or artificial rock, usually with a waterfall cascading over the entrance. Requires significant excavation and rock work.",
  infinity_edge:"One or more edges of the pool are level with the water surface, creating the illusion that the water extends to the horizon. A catch basin collects the overflow.",
  spa_attached:"A separate spa built adjacent to and connected with the main pool. Water from the heated, jetted spa spills over into the pool in a waterfall effect.",
  splash_pad:"A flat, ground-level play area with water jets - no standing water. Completely safe for toddlers. Requires its own plumbing, pump, and drain system.",
  diving_rock:"Natural-looking boulders or engineered rock formations integrated into the pool design as a jumping platform. Requires a minimum 8 ft deep end per most building codes.",
  sun_shelf_umbrella:"A Baja shelf with a built-in PVC sleeve anchored into the concrete during construction, allowing a standard patio umbrella to be inserted directly into the shelf.",
};

function FeatureCard({ feature, active, onToggle }) {
  const canvasRef = useRef(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);

    // Background gradient
    const bg = ctx.createLinearGradient(0,0,W,H);
    bg.addColorStop(0, "#0a0f1e"); bg.addColorStop(1, "#111827");
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

    // Feature-specific illustration
    const c = feature.color;
    const drawWater = (x,y,w,h,col="#1ca7c0") => {
      ctx.fillStyle=col+"99"; ctx.beginPath(); ctx.roundRect(x,y,w,h,8); ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,0.2)"; ctx.lineWidth=1;
      for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(x+w*i/3,y+4);ctx.bezierCurveTo(x+w*i/3+10,y,x+w*i/3+20,y+8,x+w*i/3+30,y+4);ctx.stroke();}
    };

    if(feature.id==="beach_entry"){
      // Gradual beach entry with gradient floor
      const grad=ctx.createLinearGradient(0,H*0.3,W,H*0.85);
      grad.addColorStop(0,"#c9a84c66"); grad.addColorStop(0.4,"#1ca7c099"); grad.addColorStop(1,"#1a5fa8cc");
      ctx.fillStyle=grad; ctx.beginPath(); ctx.moveTo(0,H*0.75); ctx.lineTo(W,H*0.45); ctx.lineTo(W,H*0.85); ctx.lineTo(0,H*0.85); ctx.closePath(); ctx.fill();
      // Sand ripples
      ctx.strokeStyle="rgba(201,168,76,0.3)"; ctx.lineWidth=1;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(W*0.2+i*30,H*0.72-i*5,40-i*8,6,0,0,Math.PI*2);ctx.stroke();}
      // Water ripples
      ctx.strokeStyle="rgba(255,255,255,0.25)"; ctx.lineWidth=1;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(W*0.4+i*40,H*0.55+i*5);ctx.bezierCurveTo(W*0.5+i*40,H*0.52+i*5,W*0.55+i*40,H*0.58+i*5,W*0.65+i*40,H*0.55+i*5);ctx.stroke();}
    } else if(feature.id==="baja_shelf"){
      drawWater(W*0.05,H*0.35,W*0.9,H*0.5,"#1ca7c0");
      // Shallow shelf
      ctx.fillStyle="#c9a84c55"; ctx.beginPath(); ctx.roundRect(W*0.1,H*0.38,W*0.4,H*0.12,6); ctx.fill();
      ctx.strokeStyle="rgba(201,168,76,0.6)"; ctx.lineWidth=2; ctx.strokeRect(W*0.1,H*0.38,W*0.4,H*0.12);
      ctx.fillStyle="rgba(201,168,76,0.8)"; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("Shallow Shelf 12\"",W*0.3,H*0.47);
      // Lounge chairs hint
      ctx.fillStyle=c+"88"; ctx.beginPath(); ctx.roundRect(W*0.15,H*0.4,18,8,3); ctx.fill();
      ctx.beginPath(); ctx.roundRect(W*0.28,H*0.4,18,8,3); ctx.fill();
    } else if(feature.id==="spa_attached"){
      drawWater(W*0.1,H*0.4,W*0.8,H*0.45,"#1a5fa8");
      // Spa circle
      ctx.fillStyle="#8b5cf699"; ctx.beginPath(); ctx.arc(W*0.25,H*0.38,W*0.15,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#8b5cf6"; ctx.lineWidth=2; ctx.stroke();
      // Jets/bubbles
      for(let i=0;i<6;i++){ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.arc(W*0.25+Math.cos(i)*W*0.1,H*0.38+Math.sin(i)*H*0.08,2,0,Math.PI*2); ctx.fill();}
      ctx.fillStyle="rgba(139,92,246,0.8)"; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("Attached Spa",W*0.25,H*0.38+3);
    } else if(feature.id==="infinity_edge"){
      drawWater(W*0.05,H*0.3,W*0.9,H*0.55,"#1ca7c0");
      // Infinity edge waterfall effect
      const inf=ctx.createLinearGradient(W*0.75,H*0.3,W*0.95,H*0.85);
      inf.addColorStop(0,"#1ca7c0cc"); inf.addColorStop(1,"transparent");
      ctx.fillStyle=inf; ctx.beginPath(); ctx.moveTo(W*0.78,H*0.3); ctx.lineTo(W*0.95,H*0.3); ctx.lineTo(W*0.9,H*0.85); ctx.lineTo(W*0.73,H*0.6); ctx.closePath(); ctx.fill();
      // Horizon line
      ctx.strokeStyle="rgba(28,167,192,0.6)"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(W*0.78,H*0.3); ctx.lineTo(W*0.95,H*0.3); ctx.stroke();
      ctx.fillStyle=c+"cc"; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("∞ Vanishing Edge",W*0.86,H*0.26);
    } else if(feature.id==="grotto"){
      // Rock arch
      ctx.fillStyle="#4a3728cc"; ctx.beginPath(); ctx.arc(W*0.5,H*0.5,W*0.28,Math.PI,Math.PI*2); ctx.fill();
      ctx.fillStyle="#5a4738cc"; ctx.beginPath(); ctx.arc(W*0.5,H*0.52,W*0.22,Math.PI,Math.PI*2); ctx.fill();
      drawWater(W*0.25,H*0.52,W*0.5,H*0.3,"#1a5fa8");
      // Waterfall
      ctx.strokeStyle="rgba(255,255,255,0.4)"; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(W*0.42,H*0.32); ctx.quadraticCurveTo(W*0.44,H*0.42,W*0.42,H*0.52); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W*0.5,H*0.3); ctx.quadraticCurveTo(W*0.5,H*0.41,W*0.5,H*0.52); ctx.stroke();
    } else if(feature.id==="diving_rock"){
      drawWater(W*0.05,H*0.45,W*0.9,H*0.45,"#1a5fa8");
      // Natural rock
      ctx.fillStyle="#6b5a4a"; ctx.beginPath(); ctx.moveTo(W*0.3,H*0.45); ctx.lineTo(W*0.2,H*0.55); ctx.lineTo(W*0.1,H*0.65); ctx.lineTo(W*0.05,H*0.65); ctx.lineTo(W*0.05,H*0.45); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#7b6a5a"; ctx.beginPath(); ctx.moveTo(W*0.28,H*0.3); ctx.lineTo(W*0.38,H*0.45); ctx.lineTo(W*0.18,H*0.45); ctx.closePath(); ctx.fill();
      // Person silhouette hint
      ctx.fillStyle=c+"88"; ctx.beginPath(); ctx.arc(W*0.32,H*0.24,6,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=c+"88"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(W*0.32,H*0.3); ctx.lineTo(W*0.32,H*0.4); ctx.moveTo(W*0.24,H*0.34); ctx.lineTo(W*0.4,H*0.34); ctx.stroke();
    } else if(feature.id==="swim_up_bar"){
      drawWater(W*0.05,H*0.4,W*0.9,H*0.48,"#1ca7c0");
      // Bar counter
      ctx.fillStyle="#8b6914cc"; ctx.beginPath(); ctx.roundRect(W*0.15,H*0.38,W*0.7,H*0.12,4); ctx.fill();
      ctx.strokeStyle="rgba(201,168,76,0.6)"; ctx.lineWidth=2; ctx.strokeRect(W*0.15,H*0.38,W*0.7,H*0.12);
      // Bar stools
      for(let i=0;i<4;i++){ctx.fillStyle=c+"88"; ctx.beginPath(); ctx.arc(W*0.25+i*W*0.16,H*0.52,6,0,Math.PI*2); ctx.fill();}
      // Glasses
      ctx.fillStyle="rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.roundRect(W*0.3,H*0.34,8,10,2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(W*0.5,H*0.34,8,10,2); ctx.fill();
    } else {
      // Generic fallback
      const gf=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.4);
      gf.addColorStop(0,c+"33"); gf.addColorStop(1,"transparent");
      ctx.fillStyle=gf; ctx.fillRect(0,0,W,H);
      drawWater(W*0.1,H*0.4,W*0.8,H*0.45,"#1ca7c0");
    }

    // Overlay: feature name at bottom
    const labelGrad=ctx.createLinearGradient(0,H*0.7,0,H);
    labelGrad.addColorStop(0,"transparent"); labelGrad.addColorStop(1,"rgba(0,0,0,0.75)");
    ctx.fillStyle=labelGrad; ctx.fillRect(0,H*0.7,W,H*0.3);
    ctx.fillStyle=c; ctx.font="bold 13px Inter,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="alphabetic";
    ctx.fillText(feature.icon+" "+feature.label, W/2, H*0.92);
    ctx.fillStyle="rgba(255,255,255,0.45)"; ctx.font="10px Inter,sans-serif";
    ctx.fillText(feature.desc, W/2, H*0.97);
  }, [feature]);

  return (
    <div style={{background:"#111827",border:`2px solid ${active ? feature.color : "#1e293b"}`,borderRadius:16,overflow:"hidden",transition:"all 0.2s",boxShadow: active ? `0 0 20px ${feature.color}33` : "none"}}>
      <div style={{position:"relative", cursor:"pointer"}} onClick={()=>setExpanded(p=>!p)}>
        <canvas ref={canvasRef} width={400} height={200} style={{width:"100%", display:"block", borderRadius:"14px 14px 0 0"}} />
        <div style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.55)",borderRadius:6,padding:"3px 8px",fontSize:10,color:"rgba(255,255,255,0.75)"}}>{expanded ? "▲ Less" : "▼ Details"}</div>
      </div>
      <div style={{padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:15,color:active?feature.color:"#e2e8f0",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              {feature.icon} {feature.label}
              {active && <span style={{fontSize:10,background:`${feature.color}33`,color:feature.color,borderRadius:20,padding:"2px 10px",fontWeight:700}}>ADDED ✓</span>}
            </div>
            <div style={{fontSize:12,color:"#64748b",marginTop:4,lineHeight:1.5}}>{feature.desc}</div>
          </div>
          <button onClick={onToggle} style={{padding:"10px 18px", borderRadius:10, border:`2px solid ${active?feature.color:"#334155"}`,background:active?`${feature.color}22`:"#1e293b",color:active?feature.color:"#94a3b8",fontWeight:800, fontSize:13, cursor:"pointer", flexShrink:0, transition:"all 0.15s",whiteSpace:"nowrap"}}>
            {active ? "✓ Added" : "+ Add"}
          </button>
        </div>
        {expanded && (
          <div style={{marginTop:12,padding:"10px 12px",background:"rgba(0,0,0,0.3)",borderRadius:10,fontSize:12,color:"#94a3b8",lineHeight:1.7}}>
            {FEATURE_DETAILS[feature.id]}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HARDSCAPE DESIGNER COMPONENT ────────────────────────────────────────────
const HARDSCAPE_CATEGORIES = [
  { id: "decking", label: "Decking", icon: "🪵", color: "#d97706", items: [
      { id:"concrete_deck",   label:"Concrete Deck",       icon:"⬜", unit:"sq ft", desc:"Poured concrete - durable and customizable" },
      { id:"travertine",      label:"Travertine Pavers",   icon:"🟫", unit:"sq ft", desc:"Natural stone - elegant and cool underfoot" },
      { id:"cool_deck",       label:"Kool Deck / Textured", icon:"🔲", unit:"sq ft", desc:"Slip-resistant textured coating - stays cool" },
      { id:"wood_composite",  label:"Composite Decking",   icon:"🪵", unit:"sq ft", desc:"Wood-look composite - low maintenance" },
  ]},
  { id: "fire", label: "Fire Features", icon: "🔥", color: "#ef4444", items: [
      { id:"fire_pit",    label:"Fire Pit",    icon:"🔥", unit:"unit", desc:"Propane or natural gas - gathering centerpiece" },
      { id:"fire_bowls",  label:"Fire Bowls",  icon:"🏺", unit:"qty",  desc:"Decorative fire bowls - dramatic accent pieces" },
  ]},
  { id: "shade", label: "Shade Structures", icon: "🏠", color: "#8b5cf6", items: [
      { id:"pergola", label:"Pergola / Shade Structure", icon:"🏠", unit:"unit", desc:"Wood or aluminum overhead structure - defines the space" },
  ]},
  { id: "walls", label: "Retaining Walls", icon: "🧱", color: "#64748b", items: [
      { id:"retaining_wall", label:"Retaining Wall", icon:"🧱", unit:"linear ft", desc:"Natural stone or block - levels the terrain" },
  ]},
  { id: "kitchen", label: "Outdoor Kitchen", icon: "🍳", color: "#0ea5e9", items: [
      { id:"outdoor_kitchen", label:"Outdoor Kitchen", icon:"🍳", unit:"unit", desc:"Built-in grill, counters, refrigerator - full outdoor cooking" },
  ]},
  { id: "landscape", label: "Landscaping", icon: "🌿", color: "#22c55e", items: [
      { id:"landscape_beds", label:"Planting Beds",      icon:"🌿", unit:"sq ft",    desc:"Landscape beds with plants, mulch, edging" },
      { id:"putting_green",  label:"Putting Green",      icon:"⛳", unit:"sq ft",    desc:"Artificial turf putting green - great for entertaining" },
      { id:"bocce",          label:"Bocce Ball Court",   icon:"🎯", unit:"unit",     desc:"Classic outdoor game court" },
  ]},
  { id: "safety", label: "Safety & Sport", icon: "🚧", color: "#f59e0b", items: [
      { id:"fence",       label:"Pool Safety Fence", icon:"🚧", unit:"linear ft", desc:"Code-required safety fence around pool" },
      { id:"sport_court", label:"Sport Court",       icon:"🏀", unit:"sq ft",    desc:"Basketball, pickleball, or multi-sport court" },
  ]},
];

function HardscapeDesigner({ hardscapes, toggleHardscape, setHSQty, dailyRenders, dailyLimit, bumpDailyRender }) {
  const [activeCat, setActiveCat] = useState("decking");
  const [photo, setPhoto] = useState(null);
  const [rendered, setRendered] = useState(null);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [style, setStyle] = useState("photorealistic");
  const [tweak, setTweak] = useState("");
  const [renderCount, setRenderCount] = useState(0);
  const [aiDesc, setAiDesc] = useState(null);

  const currentCat = HARDSCAPE_CATEGORIES.find(c=>c.id===activeCat) || HARDSCAPE_CATEGORIES[0];
  const totalSelected = HARDSCAPE_OPTIONS.filter(h=>hardscapes[h.id]!=null).length;
  const rendersLeft = dailyLimit - dailyRenders;
  const limitHit = dailyRenders >= dailyLimit;

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]; if(!file) return;
    if(!file.type.startsWith("image/")){ setError("Please choose an image file (JPG, PNG, etc)."); return; }
    if(file.size > 8*1024*1024){ setError("Photo too large - keep under 8MB"); return; }
    const reader = new FileReader();
    reader.onload = ev => { setPhoto(ev.target.result); setRendered(null); setError(null); };
    reader.readAsDataURL(file);
  };

  const handleRender = async () => {
    if(!photo){ setError("Upload a photo of your outdoor space first."); return; }
    if(totalSelected===0){ setError("Select at least one hardscape element below."); return; }
    if(limitHit){ return; }

    setRendering(true); setError(null);
    setProgress(0); setProgressMsg("Preparing your design..."); setRendered(null); setAiDesc(null);

    const steps = [[10,"Sending to FLUX..."],[24,"Analyzing your outdoor space..."],[40,"Placing hardscape elements..."],[56,"Rendering materials & textures..."],[70,"Adding lighting & atmosphere..."],[85,"Polishing final details..."]];
    let si=0;
    const interval = setInterval(()=>{ if(si<steps.length){ setProgress(steps[si][0]); setProgressMsg(steps[si][1]); si++; } }, 3000);

    try {
      const selected = HARDSCAPE_OPTIONS.filter(h=>hardscapes[h.id]!=null);
      const hsList = selected.map(h=>`${h.label}${h.unit!=="unit"?` (${hardscapes[h.id]} ${h.unit})`:""}`).join(", ");
      const styleMap = { photorealistic: "natural daylight, professional landscape architecture photography, ultra-photorealistic", twilight: "golden dusk lighting, warm sunset atmosphere, cinematic", night: "evening with outdoor lighting, warm ambient glow, dramatic night photography", magazine: "luxury landscape design magazine editorial, aspirational lifestyle, perfectly composed" };
      let prompt = `Edit this outdoor space photo to add professionally designed and built hardscape elements: ${hsList}. Everything must look completely realistic and permanently constructed. Use premium materials. ${styleMap[style]||styleMap.photorealistic}.`;
      if(tweak.trim()) prompt += ` Additional details: ${tweak.trim()}.`;

      const b64 = photo.split(",")[1];
      const mediaType = photo.startsWith("data:image/png") ? "image/png" : "image/jpeg";

      const resp = await fetch(`${RENDER_SERVICE_URL}/api/generate-pool-render`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ prompt, image:{ b64_json:b64, media_type:mediaType } }),
      });

      clearInterval(interval);
      if(!resp.ok){
        const txt = await resp.text().catch(()=>""); let parsed={}; try{parsed=JSON.parse(txt);}catch{}
        const msg = parsed?.error||txt.slice(0,120);
        if(resp.status===429) throw new Error("Rate limit - wait 60 seconds and try again.");
        throw new Error(`FLUX error ${resp.status}: ${msg}`);
      }

      const data = await resp.json();
      const b64r = data?.b64_json; const urlr = data?.url;
      if(!b64r&&!urlr) throw new Error("No image returned. Please try again.");

      setProgress(100); setProgressMsg("Done!");
      const finalImg = b64r ? `data:image/jpeg;base64,${b64r}` : urlr;
      setRendered(finalImg); setRenderCount(c=>c+1); bumpDailyRender();

      try {
        const dr = await fetch("/api/describe",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ prompt:`You are a luxury landscape designer. In 2 enthusiastic sentences, describe this outdoor design to an excited homeowner. The design includes: ${hsList}.` }) });
        const dd = await dr.json(); setAiDesc(dd?.text||null);
      } catch{}
    } catch(err){ clearInterval(interval); setError(err.message||"Something went wrong. Please try again."); }
    finally { setRendering(false); }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"#111827",border:`2px solid ${photo?"rgba(52,211,153,0.45)":"#1e293b"}`,borderRadius:16,overflow:"hidden"}}>
        <div style={{background:"linear-gradient(135deg,#134e4a,#0f3d38)",padding:"14px 16px"}}>
          <div style={{fontSize:14,fontWeight:800,color:"#34d399",marginBottom:3}}>🏡 Outdoor Space Designer</div>
          <div style={{fontSize:12,color:"#6ee7b7",lineHeight:1.5}}>Upload your backyard photo - Select elements below - FLUX renders everything into your real space</div>
        </div>
        <div style={{padding:14}}>
          <div style={{display:"flex",gap:8,marginBottom:photo?10:0}}>
            <label style={{flex:1,padding:"13px 0",borderRadius:11,background:photo?"rgba(52,211,153,0.1)":"rgba(52,211,153,0.06)",border:`1.5px solid ${photo?"rgba(52,211,153,0.45)":"rgba(52,211,153,0.2)"}`,color:photo?"#34d399":"#6ee7b7",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {photo?"✅ Photo loaded - tap to change":"📁 Upload Backyard Photo"}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{display:"none"}} />
            </label>
            {photo&&<button onClick={()=>{setPhoto(null);setRendered(null);setError(null);}} style={{padding:"13px 14px",borderRadius:11,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontWeight:700,cursor:"pointer"}}>✕</button>}
          </div>
          {photo&&<div style={{borderRadius:10,overflow:"hidden",border:"1px solid rgba(52,211,153,0.3)"}}><img src={photo} alt="outdoor space" style={{width:"100%",display:"block",maxHeight:200,objectFit:"cover"}} /></div>}
        </div>
      </div>

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:16,overflow:"hidden"}}>
        <div style={{display:"flex",overflowX:"auto",borderBottom:"1px solid #1e293b",background:"#0f172a"}}>
          {HARDSCAPE_CATEGORIES.map(cat=>{
            const catSelected = cat.items.filter(item=>hardscapes[item.id]!=null).length;
            const isActive = activeCat===cat.id;
            return(
              <button key={cat.id} onClick={()=>setActiveCat(cat.id)} style={{flexShrink:0,padding:"11px 14px",border:"none",cursor:"pointer",background:"transparent",borderBottom:`3px solid ${isActive?cat.color:"transparent"}`,color:isActive?cat.color:"#64748b",transition:"all 0.15s",position:"relative"}}>
                <div style={{fontSize:13,fontWeight:700,whiteSpace:"nowrap"}}>{cat.icon} {cat.label}</div>
                {catSelected>0&&(<div style={{position:"absolute",top:6,right:6,width:14,height:14,borderRadius:"50%",background:cat.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"white"}}>{catSelected}</div>)}
              </button>
            );
          })}
        </div>
        <div style={{padding:14,display:"flex",flexDirection:"column",gap:10}}>
          {currentCat.items.map(item=>{
            const active = hardscapes[item.id]!=null;
            return(
              <div key={item.id} style={{background:active?`${currentCat.color}11`:"#0f172a",border:`2px solid ${active?currentCat.color:"#1e293b"}`,borderRadius:12,padding:"12px 14px",transition:"all 0.15s"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:44,height:44,borderRadius:10,background:active?`${currentCat.color}22`:"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{item.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:active?currentCat.color:"#e2e8f0",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      {item.label}{active&&<span style={{fontSize:10,background:`${currentCat.color}33`,color:currentCat.color,borderRadius:20,padding:"2px 8px",fontWeight:700}}>ADDED ✓</span>}
                    </div>
                    <div style={{fontSize:12,color:"#64748b",marginTop:3}}>{item.desc}</div>
                    {active&&item.unit!=="unit"&&(
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                        <span style={{fontSize:11,color:"#64748b"}}>Quantity:</span>
                        <input type="number" value={hardscapes[item.id]||0} min={0} onChange={e=>setHSQty(item.id,e.target.value)} style={{width:80,background:"#1e293b",border:`1px solid ${currentCat.color}66`,borderRadius:8,padding:"5px 10px",color:currentCat.color,fontSize:14,fontWeight:700,outline:"none"}} />
                        <span style={{fontSize:11,color:"#64748b"}}>{item.unit}</span>
                      </div>
                    )}
                  </div>
                  <button onClick={()=>toggleHardscape(item.id)} style={{padding:"9px 16px",borderRadius:10,border:`2px solid ${active?currentCat.color:"#334155"}`,background:active?`${currentCat.color}22`:"#1e293b",color:active?currentCat.color:"#94a3b8",fontWeight:800,fontSize:13,cursor:"pointer",flexShrink:0,transition:"all 0.15s",whiteSpace:"nowrap"}}>
                    {active?"✓ Added":"+ Add"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {totalSelected>0&&(
        <div style={{background:"rgba(6,182,212,0.07)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:12,padding:12}}>
          <div style={{fontSize:11,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Your Outdoor Space Design ({totalSelected} elements)</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {HARDSCAPE_OPTIONS.filter(h=>hardscapes[h.id]!=null).map(h=>(
              <span key={h.id} style={{padding:"4px 10px",borderRadius:20,background:"rgba(6,182,212,0.12)",border:"1px solid rgba(6,182,212,0.25)",color:"#06b6d4",fontSize:12,fontWeight:600}}>
                {h.icon} {h.label}{h.unit!=="unit"?` - ${hardscapes[h.id]} ${h.unit}`:""}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:16,padding:14,display:"flex",flexDirection:"column",gap:12}}>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:11,color:"#94a3b8",fontWeight:600}}>Daily Renders Remaining</div>
            <div style={{fontSize:12,fontWeight:800,color:limitHit?"#ef4444":rendersLeft<=3?"#f59e0b":"#22c55e"}}>{limitHit?"Limit reached":`${rendersLeft} left today`}</div>
          </div>
          <div style={{height:5,background:"#1e293b",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min((dailyRenders/dailyLimit)*100,100)}%`,background:limitHit?"#ef4444":rendersLeft<=3?"linear-gradient(90deg,#f59e0b,#ef4444)":"linear-gradient(90deg,#22c55e,#34d399)",borderRadius:3,transition:"width 0.4s"}} /></div>
          <div style={{fontSize:10,color:"#334155",marginTop:4}}>{dailyRenders} of {dailyLimit} used - Pool + Hardscape renders share this limit - Resets midnight</div>
        </div>

        <div>
          <div style={{fontSize:11,color:"#34d399",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>🎨 Rendering Style</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[{id:"photorealistic",label:"📷 Photorealistic"},{id:"twilight",label:"🌅 Twilight"},{id:"night",label:"🌙 Night"},{id:"magazine",label:"✨ Magazine"}].map(s=>(
              <button key={s.id} onClick={()=>setStyle(s.id)} style={{padding:"7px 14px",borderRadius:20,border:`2px solid ${style===s.id?"#34d399":"#1e293b"}`,background:style===s.id?"rgba(52,211,153,0.1)":"transparent",color:style===s.id?"#34d399":"#64748b",fontSize:12,fontWeight:600,cursor:"pointer"}}>{s.label}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{fontSize:11,color:"#34d399",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>✍️ Additional Instructions</div>
          <textarea value={tweak} onChange={e=>setTweak(e.target.value)} placeholder="e.g. 'use travertine throughout, add string lights, mature palms in corners'" rows={2}
            style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"9px 12px",color:"#e2e8f0",fontSize:13,outline:"none",resize:"none",boxSizing:"border-box",lineHeight:1.5,fontFamily:"inherit"}} />
        </div>

        {dailyLimit <= 0 ? (
          <div style={{padding:"14px",borderRadius:12,background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.2)",textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#a78bfa",marginBottom:4}}>🔒 Subscribe to Start Rendering</div>
            <div style={{fontSize:12,color:"#94a3b8"}}>AI rendering needs an active Basic or Pro plan - subscribe in Settings to unlock it.</div>
          </div>
        ) : limitHit ? (
          <div style={{padding:"14px",borderRadius:12,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#ef4444",marginBottom:4}}>⏰ Daily Limit Reached</div>
            <div style={{fontSize:12,color:"#94a3b8"}}>All {dailyLimit} renders used today. Resets at midnight.</div>
          </div>
        ) : (
          <button onClick={rendering?null:handleRender} style={{width:"100%",padding:"16px",borderRadius:12,background:rendering?"#1e293b":"linear-gradient(135deg,#059669,#047857)",border:"none",color:"white",fontWeight:800,fontSize:15,cursor:rendering?"not-allowed":"pointer",boxShadow:rendering?"none":"0 4px 20px rgba(5,150,105,0.3)",transition:"all 0.2s"}}>
            {rendering?`⏳ ${progressMsg}`:rendered?"🔄 Generate New Variation":"🚀 Generate Hardscape Rendering"}
          </button>
        )}

        {rendering&&(
          <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:12,color:"#34d399",fontWeight:600}}>{progressMsg}</span><span style={{fontSize:12,color:"#64748b"}}>{progress}%</span></div>
            <div style={{height:5,background:"#1e293b",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#059669,#34d399,#06b6d4)",borderRadius:3,transition:"width 2.5s ease"}} /></div>
          </div>
        )}

        {error&&!rendering&&(
          <div style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,padding:12}}>
            <div style={{fontSize:13,color:"#ef4444",fontWeight:600,marginBottom:8}}>⚠️ {error}</div>
            <button onClick={()=>setError(null)} style={{padding:"6px 12px",borderRadius:8,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontSize:12,fontWeight:700,cursor:"pointer"}}>Dismiss</button>
          </div>
        )}

        {rendered&&!rendering&&(
          <div style={{background:"#0f172a",border:"2px solid rgba(52,211,153,0.35)",borderRadius:14,overflow:"hidden",boxShadow:"0 6px 30px rgba(52,211,153,0.12)"}}>
            <div style={{position:"relative"}}>
              <img src={rendered} alt="Hardscape rendering" style={{width:"100%",display:"block"}} />
              <div style={{position:"absolute",top:10,left:10,background:"rgba(5,150,105,0.92)",borderRadius:8,padding:"5px 12px",fontSize:11,color:"white",fontWeight:700}}>🏡 FLUX - Outdoor Design #{renderCount}</div>
              <div style={{position:"absolute",top:10,right:10,background:"rgba(0,0,0,0.6)",borderRadius:8,padding:"4px 10px",fontSize:10,color:"#94a3b8"}}>Pool Craft Pro</div>
            </div>
            {aiDesc&&(<div style={{padding:"12px 14px",background:"rgba(52,211,153,0.06)",borderTop:"1px solid rgba(52,211,153,0.15)"}}><div style={{fontSize:10,color:"#34d399",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>🤖 AI Designer Notes</div><div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6,fontStyle:"italic"}}>{aiDesc}</div></div>)}
            <div style={{padding:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={()=>{setRendered(null);setAiDesc(null);setError(null);}} style={{padding:"11px",borderRadius:10,background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.3)",color:"#34d399",fontWeight:700,fontSize:13,cursor:"pointer"}}>🔄 New Variation</button>
              <a href={rendered} download={`poolcraft-hardscape-${renderCount}.jpg`} style={{padding:"11px",borderRadius:10,background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.3)",color:"#06b6d4",fontWeight:700,fontSize:13,textDecoration:"none",textAlign:"center",display:"block"}}>⬇️ Save Design</a>
            </div>
          </div>
        )}

        {rendered&&!rendering&&(
          <MaskTweakPanel imageUrl={rendered} onTweaked={setRendered} dailyRenders={dailyRenders} dailyLimit={dailyLimit} bumpDailyRender={bumpDailyRender} />
        )}
      </div>
    </div>
  );
}

// ─── SITE PLAN MAP — Mapbox GL JS + Regrid parcels + Turf.js setbacks ─────────
function SitePlanMap({ poolLen, poolWid, poolShape, poolColor, initialAddress }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const centerMarkerRef = useRef(null);
  const rotateMarkerRef = useRef(null);
  const rotatingRef = useRef(false);
  const poolCenterRef = useRef(null);
  const poolLenRef = useRef(poolLen);
  const rotationDegRef = useRef(0);

  const [mapboxToken, setMapboxTokenState] = useState(getMapboxToken());
  const [tokenInput, setTokenInput] = useState("");
  const [mapReady, setMapReady] = useState(false);

  const [parcelPolygon, setParcelPolygon] = useState(null);
  const [parcelAttrs, setParcelAttrs] = useState(null);
  const [parcelSource, setParcelSource] = useState(null);
  const [searchPoint, setSearchPoint] = useState(null);
  const [loadingParcel, setLoadingParcel] = useState(false);
  const [parcelError, setParcelError] = useState(null);

  const [rearSetback, setRearSetback] = useState(10);
  const [sideSetback, setSideSetback] = useState(5);
  const [houseSetback, setHouseSetback] = useState(20);

  const [poolCenter, setPoolCenter] = useState(null);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [initError, setInitError] = useState(null);

  useEffect(() => { poolCenterRef.current = poolCenter; }, [poolCenter]);
  useEffect(() => { poolLenRef.current = poolLen; }, [poolLen]);
  useEffect(() => { rotationDegRef.current = rotationDeg; }, [rotationDeg]);

  const saveMapboxToken = () => {
    const t = tokenInput.trim();
    if (!t) return;
    setMapboxTokenStorage(t);
    setMapboxTokenState(t);
    setTokenInput("");
  };
  const removeMapboxToken = () => {
    setMapboxTokenStorage("");
    setMapboxTokenState("");
    setMapReady(false);
    setInitError(null);
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
  };

  // Initialize the map once a token is available. Reused across address
  // searches - only torn down on unmount or when the token itself changes.
  // A malformed/invalid token throws synchronously inside the Geocoder
  // plugin's constructor (it validates the token's JWT-like shape) - without
  // this try/catch that exception has no boundary and takes down the whole
  // app to a blank screen, so every step here is guarded.
  useEffect(() => {
    if (!mapboxToken || mapRef.current || !mapContainerRef.current) return;
    try {
      mapboxgl.accessToken = mapboxToken;
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: [-98.5795, 39.8283],
        zoom: 4,
        pitch: 0,
      });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      const geocoder = new MapboxGeocoder({
        accessToken: mapboxToken,
        mapboxgl,
        marker: false,
        placeholder: "Enter property address...",
        types: "address",
      });
      geocoderRef.current = geocoder;
      map.addControl(geocoder, "top-left");

      geocoder.on("result", (e) => {
        const center = e.result.center;
        map.flyTo({ center, zoom: 19, pitch: 0, essential: true });
        setParcelError(null);
        setSearchPoint(center);
      });

      map.on("error", (e) => {
        setInitError(e?.error?.message || "This Mapbox token was rejected — double check it's a valid public token (starts with \"pk.\").");
      });

      map.on("load", () => {
        setMapReady(true);
        if (initialAddress) geocoder.query(initialAddress);
      });
    } catch (err) {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      setInitError(err.message || "Couldn't initialize the map — this Mapbox token looks invalid.");
      return;
    }

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

  // Add sources/layers once, after the style has loaded.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || map.getSource("parcel-src")) return;

    map.addSource("parcel-src", { type: "geojson", data: turf.featureCollection([]) });
    map.addLayer({ id: "parcel-fill", type: "fill", source: "parcel-src", paint: { "fill-color": "#e2e8f0", "fill-opacity": 0.05 } });
    map.addLayer({ id: "parcel-line", type: "line", source: "parcel-src", paint: { "line-color": "#e2e8f0", "line-width": 2 } });

    map.addSource("envelope-src", { type: "geojson", data: turf.featureCollection([]) });
    map.addLayer({ id: "envelope-line", type: "line", source: "envelope-src", paint: { "line-color": "#3b82f6", "line-width": 2, "line-dasharray": [2, 2] } });

    map.addSource("pool-src", { type: "geojson", data: turf.featureCollection([]) });
    map.addLayer({ id: "pool-fill", type: "fill", source: "pool-src", paint: { "fill-color": poolColor || "#0ea5e9", "fill-opacity": 0.55 } });
    map.addLayer({ id: "pool-line", type: "line", source: "pool-src", paint: { "line-color": "#22c55e", "line-width": 3 } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getLayer("pool-fill")) return;
    map.setPaintProperty("pool-fill", "fill-color", poolColor || "#0ea5e9");
  }, [poolColor, mapReady]);

  // Fetch parcel data whenever a new address is searched.
  useEffect(() => {
    if (!searchPoint) return;
    let ignore = false;
    if (centerMarkerRef.current) { centerMarkerRef.current.remove(); centerMarkerRef.current = null; }
    if (rotateMarkerRef.current) { rotateMarkerRef.current.remove(); rotateMarkerRef.current = null; }
    (async () => {
      setLoadingParcel(true);
      setParcelError(null);
      try {
        const [lng, lat] = searchPoint;
        const result = await fetchParcelPolygon(lat, lng);
        if (ignore) return;
        setParcelPolygon(result.polygon);
        setParcelAttrs(result.attrs);
        setParcelSource(result.source);
        setRotationDeg(0);
        setPoolCenter(turf.centroid(result.polygon).geometry.coordinates);
      } catch (err) {
        if (!ignore) setParcelError(err.message || "Couldn't load parcel data");
      } finally {
        if (!ignore) setLoadingParcel(false);
      }
    })();
    return () => { ignore = true; };
  }, [searchPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getSource("parcel-src")) return;
    map.getSource("parcel-src").setData(parcelPolygon ? turf.featureCollection([parcelPolygon]) : turf.featureCollection([]));
  }, [parcelPolygon, mapReady]);

  const envelopePolygon = useMemo(() => {
    if (!parcelPolygon) return null;
    try {
      return buildSetbackEnvelope(parcelPolygon, searchPoint ? turf.point(searchPoint) : null, { houseSetback, rearSetback, sideSetback });
    } catch { return null; }
  }, [parcelPolygon, searchPoint, houseSetback, rearSetback, sideSetback]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getSource("envelope-src")) return;
    map.getSource("envelope-src").setData(envelopePolygon ? turf.featureCollection([envelopePolygon]) : turf.featureCollection([]));
  }, [envelopePolygon, mapReady]);

  const poolPolygon = useMemo(() => {
    if (!poolCenter) return null;
    return buildRectPolygon(poolCenter, poolLen, poolWid, rotationDeg);
  }, [poolCenter, poolLen, poolWid, rotationDeg]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getSource("pool-src")) return;
    map.getSource("pool-src").setData(poolPolygon ? turf.featureCollection([poolPolygon]) : turf.featureCollection([]));
  }, [poolPolygon, mapReady]);

  const collision = useMemo(() => {
    if (!poolPolygon) return false;
    const boundary = envelopePolygon || parcelPolygon;
    if (!boundary) return false;
    try { return !turf.booleanWithin(poolPolygon, boundary); }
    catch { return false; }
  }, [poolPolygon, envelopePolygon, parcelPolygon]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.getLayer("pool-line")) return;
    map.setPaintProperty("pool-line", "line-color", collision ? "#ef4444" : "#22c55e");
  }, [collision, mapReady]);

  // Create the move/rotate drag handles once per new parcel search.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !parcelPolygon || !poolCenterRef.current) return;
    if (centerMarkerRef.current || rotateMarkerRef.current) return;

    const centerEl = document.createElement("div");
    centerEl.textContent = "✛";
    centerEl.style.cssText = "font-size:24px;line-height:1;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000,0 0 3px #000;cursor:grab;user-select:none;";
    const centerMarker = new mapboxgl.Marker({ element: centerEl, draggable: true, anchor: "center" })
      .setLngLat(poolCenterRef.current).addTo(map);
    centerMarker.on("drag", () => {
      const ll = centerMarker.getLngLat();
      setPoolCenter([ll.lng, ll.lat]);
    });
    centerMarkerRef.current = centerMarker;

    const rotateEl = document.createElement("div");
    rotateEl.textContent = "↻";
    rotateEl.style.cssText = "font-size:15px;line-height:1;width:26px;height:26px;border-radius:50%;background:rgba(15,23,42,0.78);border:2px solid #fbbf24;color:#fbbf24;display:flex;align-items:center;justify-content:center;cursor:grab;user-select:none;";
    const initHandlePos = turf.destination(poolCenterRef.current, poolLenRef.current / 2 + 8, rotationDegRef.current, { units: "feet" }).geometry.coordinates;
    const rotateMarker = new mapboxgl.Marker({ element: rotateEl, draggable: true, anchor: "center" })
      .setLngLat(initHandlePos).addTo(map);
    rotateMarker.on("dragstart", () => { rotatingRef.current = true; });
    rotateMarker.on("drag", () => {
      const ll = rotateMarker.getLngLat();
      setRotationDeg(turf.bearing(poolCenterRef.current, [ll.lng, ll.lat]));
    });
    rotateMarker.on("dragend", () => { rotatingRef.current = false; });
    rotateMarkerRef.current = rotateMarker;

    return () => {
      centerMarker.remove(); centerMarkerRef.current = null;
      rotateMarker.remove(); rotateMarkerRef.current = null;
    };
  }, [mapReady, parcelPolygon]);

  // Keep the rotate handle glued to the pool as it moves/rotates/resizes,
  // except while the user has it actively grabbed (avoid fighting the drag).
  useEffect(() => {
    if (rotatingRef.current || !rotateMarkerRef.current || !poolCenter) return;
    const handlePos = turf.destination(poolCenter, poolLen / 2 + 8, rotationDeg, { units: "feet" }).geometry.coordinates;
    rotateMarkerRef.current.setLngLat(handlePos);
  }, [poolCenter, rotationDeg, poolLen]);

  useEffect(() => () => {
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
  }, []);

  if (!mapboxToken) {
    return (
      <div style={{background:"#0f172a",border:"1px dashed #334155",borderRadius:14,padding:20,textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:8}}>🗺️</div>
        <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginBottom:6}}>Add a Mapbox token to enable the Site Plan map</div>
        <div style={{fontSize:12,color:"#64748b",marginBottom:14}}>Free at mapbox.com — grab a public access token (starts with "pk.") from your account's Tokens page.</div>
        <div style={{display:"flex",gap:6,maxWidth:420,margin:"0 auto"}}>
          <input type="password" value={tokenInput} onChange={e=>setTokenInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveMapboxToken()} placeholder="Paste Mapbox public token (pk....)" style={{flex:1,background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"9px 12px",color:"#e2e8f0",fontSize:12,outline:"none"}}/>
          <button onClick={saveMapboxToken} disabled={!tokenInput.trim()} style={{padding:"9px 16px",borderRadius:8,background:tokenInput.trim()?"rgba(6,182,212,0.15)":"#1e293b",border:"1px solid rgba(6,182,212,0.3)",color:tokenInput.trim()?"#06b6d4":"#64748b",fontSize:12,fontWeight:700,cursor:tokenInput.trim()?"pointer":"not-allowed"}}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
        <div style={{fontSize:12,color:"#64748b"}}>Search an address, then drag the ✛ handle to move the pool and the ↻ handle to rotate it.</div>
        <button onClick={removeMapboxToken} style={{fontSize:11,color:"#64748b",background:"none",border:"none",cursor:"pointer",padding:"4px 2px"}}>Remove Mapbox token</button>
      </div>

      {initError && (
        <div style={{padding:"12px 14px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:10}}>
          <div style={{fontSize:12,color:"#ef4444",fontWeight:700,marginBottom:6}}>⚠️ {initError}</div>
          <button onClick={removeMapboxToken} style={{padding:"7px 12px",borderRadius:8,background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444",fontSize:12,fontWeight:700,cursor:"pointer"}}>Remove token & try again</button>
        </div>
      )}

      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[
          {label:"House / Front Setback (ft)", val:houseSetback, set:setHouseSetback},
          {label:"Rear Setback (ft)", val:rearSetback, set:setRearSetback},
          {label:"Side Setback (ft)", val:sideSetback, set:setSideSetback},
        ].map(s=>(
          <div key={s.label} style={{flex:"1 1 140px"}}>
            <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{s.label}</div>
            <input type="number" min="0" max="200" value={s.val} onChange={e=>s.set(Math.max(0, Number(e.target.value)||0))}
              style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"8px 10px",color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
        ))}
      </div>

      <div style={{position:"relative",borderRadius:14,overflow:"hidden",border:"2px solid #334155",boxShadow:"0 4px 24px rgba(0,0,0,0.5)"}}>
        <div ref={mapContainerRef} style={{width:"100%",height:520}} />
        {loadingParcel && (
          <div style={{position:"absolute",bottom:10,left:10,background:"rgba(15,23,42,0.85)",borderRadius:8,padding:"6px 12px",fontSize:12,color:"#94a3b8",fontWeight:600}}>⏳ Loading parcel data...</div>
        )}
        {collision && parcelPolygon && (
          <div style={{position:"absolute",top:10,left:10,right:10,background:"rgba(239,68,68,0.95)",borderRadius:8,padding:"8px 14px",fontSize:12,color:"white",fontWeight:700,textAlign:"center"}}>
            ⚠️ Pool crosses the setback line or property boundary — drag or rotate it to clear
          </div>
        )}
      </div>

      {parcelError && <div style={{padding:"10px 14px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:10,fontSize:12,color:"#ef4444"}}>⚠️ {parcelError}</div>}

      {parcelAttrs && (
        <div style={{background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:12,padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:12,color:"#06b6d4",fontWeight:700}}>📍 Parcel Data</div>
            <div style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:parcelSource==="regrid"?"rgba(34,197,94,0.15)":"rgba(245,158,11,0.15)",border:`1px solid ${parcelSource==="regrid"?"rgba(34,197,94,0.3)":"rgba(245,158,11,0.3)"}`,color:parcelSource==="regrid"?"#22c55e":"#f59e0b",fontWeight:700}}>{parcelSource==="regrid"?"🟢 Live Regrid Data":"🟡 Estimated"}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{label:"Parcel / APN",val:parcelAttrs.parcel},{label:"Lot Size",val:parcelAttrs.lot_size},{label:"Lot Sq Ft",val:parcelAttrs.lot_sqft},{label:"Zoning",val:parcelAttrs.zoning}].map(r=>(
              <div key={r.label} style={{background:"#1e293b",borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>{r.label}</div><div style={{fontSize:13,fontWeight:700,color:"#e2e8f0",marginTop:2}}>{r.val}</div></div>
            ))}
          </div>
        </div>
      )}

      <div style={{fontSize:11,color:"#64748b"}}>{POOL_SHAPES.find(s=>s.id===poolShape)?.label || "Pool"} shown as its {poolLen}' x {poolWid}' bounding rectangle for setback/placement purposes. Setback data is for planning reference — always verify with your local building department before permit submission.</div>
      <RegridKeyPanel />
    </div>
  );
}

// ─── ENGINEERING SCHEMATIC TAB ─────────────────────────────────────────────────
// Adapter + config panel + export wiring around schematicEngine.js/SchematicView.
// Real per-shape geometry now comes from poolShapes.js - Pool3D and
// SitePlanMap still treat every shape as a plain rectangle (see their own
// comments), but this tab no longer needs to.
const SHALLOW_DEPTH_BY_PROFILE = { shallow: 3, standard: 3.5, deep: 3.5, diving: 4 };
const DEEP_DEPTH_BY_PROFILE = { shallow: 4, standard: 5, deep: 6, diving: 8 };

function poolStateToSchematicInput(shape, len, wid, depthId) {
  const safeLen = Number.isFinite(len) && len > 0 ? len : 1;
  const safeWid = Number.isFinite(wid) && wid > 0 ? wid : 1;
  const polygon = buildPoolPolygon(shape, safeLen, safeWid);
  const bounds = polygonBounds(polygon);

  const shallowD = SHALLOW_DEPTH_BY_PROFILE[depthId] ?? 3.5;
  const deepD = DEEP_DEPTH_BY_PROFILE[depthId] ?? 5;
  // No stored shallow/deep zone boundary exists anywhere in the app (see
  // schematicEngine.js's header) - assume the deep end occupies the back
  // third of the pool's bounding length, a common simplification for a
  // residential pool. This is just a rough rectangular slice, not clipped to
  // the actual (possibly curved/concave) outline - computeMainDrainPosition
  // already falls back to a point genuinely inside the real polygon if this
  // naive slice's centroid lands outside it (e.g. past an oval's curved end).
  const splitX = bounds.minX + (bounds.maxX - bounds.minX) * (2 / 3);
  const depthZones = [
    { id: "shallow", depthFt: shallowD, polygon: [{ x: bounds.minX, y: bounds.minY }, { x: splitX, y: bounds.minY }, { x: splitX, y: bounds.maxY }, { x: bounds.minX, y: bounds.maxY }] },
    { id: "deep", depthFt: deepD, polygon: [{ x: splitX, y: bounds.minY }, { x: bounds.maxX, y: bounds.minY }, { x: bounds.maxX, y: bounds.maxY }, { x: splitX, y: bounds.maxY }] },
  ];
  // Auto-placed default (no manual placement UI yet) - to the side of the
  // pool, centered along its bounding width, matching typical equipment pad
  // placement.
  const equipmentPad = { x: bounds.minX - 6, y: (bounds.minY + bounds.maxY) / 2 };
  return { polygon, depthZones, equipmentPad };
}

function SchematicTab({ poolLen, poolWid, poolShape, depthId }) {
  const [rebarSpacingIn, setRebarSpacingIn] = useState(12);
  const [skimmerAreaSqFt, setSkimmerAreaSqFt] = useState(500);
  const [returnMin, setReturnMin] = useState(8);
  const [returnMax, setReturnMax] = useState(10);
  const svgWrapRef = useRef(null);

  const { polygon, depthZones, equipmentPad } = useMemo(
    () => poolStateToSchematicInput(poolShape, poolLen, poolWid, depthId),
    [poolShape, poolLen, poolWid, depthId]
  );

  const config = useMemo(() => ({
    rebarSpacingFt: Math.max(0.1, (Number(rebarSpacingIn) || 12) / 12),
    skimmerAreaSqFt: Math.max(50, Number(skimmerAreaSqFt) || 500),
    minSkimmers: 1,
    returnSpacing: { min: Math.min(returnMin, returnMax), max: Math.max(returnMin, returnMax) },
    returnOffsetFt: 3,
  }), [rebarSpacingIn, skimmerAreaSqFt, returnMin, returnMax]);

  const schematic = useMemo(() => {
    try { return generateSchematic({ polygon, depthZones, equipmentPad }, config); }
    catch (err) { console.error("SchematicTab: generateSchematic failed", err); return null; }
  }, [polygon, depthZones, equipmentPad, config]);

  const totalRebarLinFt = useMemo(() => {
    if (!schematic) return 0;
    return Math.round(schematic.rebarGrid.lines.reduce((sum, l) => sum + Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y) * l.count, 0));
  }, [schematic]);

  // Reuses the exact window.open + document.write + window.print() pattern
  // generatePDF() already uses elsewhere in the app - no PDF library in this
  // project, and the browser's own print-to-PDF handles it. The SVG is
  // embedded as real vector markup (not rasterized to PNG) since this is a
  // technical drawing people may need to zoom into.
  const exportPdf = () => {
    const svgEl = svgWrapRef.current?.querySelector("svg");
    if (!svgEl) return;
    const win = window.open("", "_blank");
    if (!win) { alert("Please allow pop-ups for this site to export or print."); return; }
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    win.document.write(`<!DOCTYPE html><html><head><title>Pool Craft Pro — Engineering Schematic</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#fff;color:#1e293b;padding:32px}
    .header{margin-bottom:20px}.logo{font-size:18px;font-weight:800;color:#1a2f5e;font-family:Georgia,serif}
    .meta{font-size:12px;color:#64748b;margin-top:4px}svg{width:100%;max-width:900px;border:1px solid #e2e8f0;border-radius:8px}
    .config{display:flex;gap:20px;margin-top:16px;font-size:12px;color:#334155;flex-wrap:wrap}
    .disclaimer{margin-top:20px;padding-top:14px;border-top:2px solid #e2e8f0;font-size:11px;color:#94a3b8;line-height:1.6}
    @media print{body{padding:16px}}</style></head><body>
    <div class="header"><div class="logo">POOL <span style="color:#c9a84c">CRAFT</span> PRO — Engineering Schematic</div><div class="meta">${poolLen}' x ${poolWid}' pool — generated ${date}</div></div>
    ${svgEl.outerHTML}
    <div class="config">
      <div><strong>Rebar spacing:</strong> ${rebarSpacingIn}" o.c.</div>
      <div><strong>Skimmer coverage:</strong> ${skimmerAreaSqFt} sq ft / skimmer</div>
      <div><strong>Return spacing:</strong> ${config.returnSpacing.min}-${config.returnSpacing.max} ft</div>
      <div><strong>Total rebar:</strong> ~${totalRebarLinFt.toLocaleString()} linear ft</div>
    </div>
    <div class="disclaimer">⚠️ Preliminary layout for planning purposes only. Verify rebar spacing, plumbing design, and equipment placement against local building code and a licensed engineer's stamped drawing before construction.</div>
    <script>window.onload=()=>setTimeout(()=>window.print(),500);</script>
    </body></html>`);
    win.document.close();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 14, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#06b6d4", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>⚙️ Schematic Settings</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { label: "Rebar Grid Spacing (in)", val: rebarSpacingIn, set: setRebarSpacingIn, min: 6, max: 24 },
            { label: "Skimmer Coverage (sq ft)", val: skimmerAreaSqFt, set: setSkimmerAreaSqFt, min: 100, max: 1000 },
            { label: "Return Spacing Min (ft)", val: returnMin, set: setReturnMin, min: 4, max: 20 },
            { label: "Return Spacing Max (ft)", val: returnMax, set: setReturnMax, min: 4, max: 20 },
          ].map((f) => (
            <div key={f.label} style={{ flex: "1 1 150px" }}>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{f.label}</div>
              <input type="number" min={f.min} max={f.max} value={f.val}
                onChange={(e) => f.set(Math.max(f.min, Number(e.target.value) || f.min))}
                style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 10px", color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
        </div>
      </div>

      {schematic && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {[
            { label: "Skimmers", val: schematic.skimmers.length },
            { label: "Returns", val: schematic.returns.length },
            { label: "Rebar (linear ft)", val: totalRebarLinFt.toLocaleString() },
          ].map((s) => (
            <div key={s.label} style={{ background: "#1e293b", borderRadius: 8, padding: "9px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#06b6d4" }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      <div ref={svgWrapRef}>
        <SchematicView polygon={polygon} schematic={schematic} equipmentPad={equipmentPad} />
      </div>

      <button onClick={exportPdf} disabled={!schematic}
        style={{ padding: "12px", borderRadius: 10, background: schematic ? "linear-gradient(135deg,#06b6d4,#0284c7)" : "#1e293b", border: "none", color: schematic ? "white" : "#64748b", fontWeight: 700, fontSize: 13, cursor: schematic ? "pointer" : "not-allowed" }}>
        🖨️ Export as PDF
      </button>

      <div style={{ fontSize: 11, color: "#64748b" }}>
        {POOL_SHAPES.find((s) => s.id === poolShape)?.label || "Pool"} shape shown at {poolLen}' x {poolWid}'.{" "}
        {poolShape === "freeform"
          ? "Freeform pools are custom-designed in real life - this is a generic illustrative outline, not a trace of any specific design."
          : "A standardized approximation of this shape family - actual curves/angles on your project may differ."}
      </div>
    </div>
  );
}

// ─── HOW IT WORKS — plain-English tour, visible to everyone (paying or not) ────
const HOW_IT_WORKS_SECTIONS = [
  { icon:"🏊", title:"Design your pool in minutes", body:"Pick a shape, punch in the length and width, choose a finish and water color, and watch an instant 3D model appear. No CAD software, no drafting wait." },
  { icon:"📸", title:"See it in your actual backyard", body:"Upload a photo of the real yard and FLUX AI renders a photorealistic pool right into it — correct lighting, shadows, and perspective. Homeowners stop having to imagine it." },
  { icon:"🗺️", title:"Know it'll pass setback compliance before you dig", body:"Search the real address, pull the real parcel boundary, and drag the pool into place on a true-to-scale map. If it crosses a setback line, it turns red — before permits, not after." },
  { icon:"📐", title:"Get a real engineering layout, not a guess", body:"Rebar grid spacing, skimmer and return placement, main drain location, plumbing runs — generated automatically from the pool's actual dimensions, not eyeballed." },
  { icon:"📊", title:"Every material and cost, calculated for you", body:"Excavation, gunite, rebar, plumbing, tile, plaster bags — all computed from the pool's real geometry the moment you set its dimensions. No spreadsheets, no manual math." },
  { icon:"💰", title:"A cost estimate and a client-ready quote, instantly", body:"See a full cost breakdown by category, adjust it to your local market, then generate a polished proposal or formal quote to send — the same numbers, no re-typing." },
  { icon:"⚙️", title:"Equipment sized correctly, every time", body:"Pump, filter, heater, and automation recommendations sized to your pool's actual gallon count, across Pentair, Hayward, or Jandy." },
  { icon:"🏗️", title:"A build timeline and post-sale tracker", body:"An 8-phase schedule estimate for planning conversations, then a build tracker to keep the client updated once the contract is signed." },
];

function HowItWorksTab({ onSubscribeClick }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"linear-gradient(135deg,rgba(124,58,237,0.18),rgba(6,182,212,0.1))",border:"1px solid rgba(124,58,237,0.3)",borderRadius:16,padding:20}}>
        <div style={{fontSize:11,color:"#a78bfa",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>✨ What Pool Craft Pro Actually Does</div>
        <div style={{fontSize:18,fontWeight:800,color:"#e2e8f0",lineHeight:1.4}}>Design, render, engineer, price, and quote a pool project — all in one place, with the calculations already done for you.</div>
        <div style={{fontSize:13,color:"#94a3b8",marginTop:10,lineHeight:1.6}}>Most pool builders juggle a separate design tool, a separate estimating spreadsheet, and a separate way to send quotes. This app replaces all three — so a conversation with a customer can go from "what if we put a pool here?" to a real rendering, a real cost estimate, and a real quote, in one sitting.</div>
      </div>

      {HOW_IT_WORKS_SECTIONS.map((s,i)=>(
        <div key={s.title} style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:16,display:"flex",gap:14,alignItems:"flex-start"}}>
          <div style={{fontSize:28,flexShrink:0,width:36,textAlign:"center"}}>{s.icon}</div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginBottom:4}}>{i+1}. {s.title}</div>
            <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>{s.body}</div>
          </div>
        </div>
      ))}

      <div style={{background:"linear-gradient(135deg,rgba(34,197,94,0.12),rgba(6,182,212,0.08))",border:"1px solid rgba(34,197,94,0.3)",borderRadius:16,padding:20,textAlign:"center"}}>
        <div style={{fontSize:15,fontWeight:800,color:"#22c55e",marginBottom:6}}>Try every tab above free right now — no card required</div>
        <div style={{fontSize:12,color:"#94a3b8",marginBottom:14,lineHeight:1.6}}>Design, site planning, materials, cost estimating, quotes, and the engineering schematic are all open to explore. A subscription unlocks AI photorealistic rendering of your actual design.</div>
        <button onClick={onSubscribeClick} style={{padding:"12px 24px",borderRadius:10,background:"linear-gradient(135deg,#7c3aed,#5b21b6)",border:"none",color:"white",fontWeight:700,fontSize:14,cursor:"pointer"}}>
          See Plans & Pricing →
        </button>
      </div>
    </div>
  );
}

// ─── SPLASH SCREEN ─────────────────────────────────────────────────────────────
function SplashScreen({ onDone }) {
  useEffect(() => { setTimeout(onDone, 2400); }, []);
  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,background:"linear-gradient(135deg,#0a0f1e 0%,#0f1e3d 50%,#080d18 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:0}}>
      <div style={{position:"relative",width:120,height:120,marginBottom:20}}>
        {[1,2,3].map(i=>(<div key={i} style={{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid rgba(201,168,76,0.3)",animation:`ripple ${i*0.6+0.6}s ease-out infinite`,animationDelay:`${i*0.2}s`}} />))}
        {/* FCP monogram with water drop */}
        <div style={{position:"absolute",inset:8,borderRadius:"50%",background:"linear-gradient(135deg,#1a2f5e,#0f1e3d)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 40px rgba(201,168,76,0.35)"}}>
          <svg viewBox="0 0 80 60" width="70" height="52">
            <defs>
              <linearGradient id="sNavy" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4a7ab5"/><stop offset="100%" stopColor="#1a2f5e"/></linearGradient>
              <linearGradient id="sGold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#e8c96a"/><stop offset="100%" stopColor="#a8873a"/></linearGradient>
              <linearGradient id="sDrop" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6aaee8"/><stop offset="100%" stopColor="#1a5fa8"/></linearGradient>
            </defs>
            <text x="2" y="46" fontFamily="Georgia,serif" fontWeight="700" fontSize="46" fill="url(#sNavy)">F</text>
            <path d="M 40 2 C 40 2, 29 20, 29 28 C 29 36 34 42 40 42 C 46 42 51 36 51 28 C 51 20 40 2 40 2 Z" fill="url(#sDrop)"/>
            <ellipse cx="36" cy="22" rx="3" ry="5" fill="white" opacity="0.35" transform="rotate(-15 36 22)"/>
            <text x="44" y="46" fontFamily="Georgia,serif" fontWeight="700" fontSize="46" fill="url(#sGold)">P</text>
          </svg>
        </div>
      </div>
      {/* Wordmark */}
      <div style={{textAlign:"center",marginBottom:8}}>
        <div style={{fontSize:32,fontWeight:900,letterSpacing:"3px",fontFamily:"Georgia,serif"}}>
          <span style={{color:"#e2e8f0"}}>POOL </span>
          <span style={{color:"#c9a84c"}}>CRAFT </span>
          <span style={{color:"#e2e8f0"}}>PRO</span>
        </div>
        <div style={{fontSize:11,color:"#8a9ab5",letterSpacing:"2.5px",textTransform:"uppercase",marginTop:6,fontFamily:"sans-serif"}}>Design Pools. Craft Outdoor Living.</div>
      </div>
      <div style={{marginTop:32,display:"flex",gap:6}}>{[0,1,2].map(i=>(<div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#c9a84c",opacity:0.4,animation:"pulse 1s ease-in-out infinite",animationDelay:`${i*0.2}s`}} />))}</div>
      <style>{`@keyframes ripple{0%{transform:scale(0.8);opacity:0.8}100%{transform:scale(2.2);opacity:0}}@keyframes pulse{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}`}</style>
    </div>
  );
}

// ─── COST ESTIMATOR ────────────────────────────────────────────────────────────
// Sq ft of interior surface one bag of each finish material typically covers -
// pre-fills the plaster calculator's coverage field, still user-editable.
const PLASTER_COVERAGE_PRESETS = { plaster: 32, quartz: 22, pebble: 18 };
const PLASTER_FINISH_OPTIONS = [
  { id: "plaster", label: "White Plaster" },
  { id: "quartz", label: "Quartz" },
  { id: "pebble", label: "Pebble" },
];

const COST_RANGES = {
  plaster: { low:5, high:8, unit:"sq ft", label:"Plaster Finish" },
  pebble: { low:8, high:14, unit:"sq ft", label:"Pebble Tec Finish" },
  quartz: { low:7, high:12, unit:"sq ft", label:"Quartz Finish" },
  tile: { low:20, high:45, unit:"sq ft", label:"Full Tile Finish" },
  fiberglass: { low:4, high:7, unit:"sq ft", label:"Fiberglass Finish" },
  glass_bead: { low:10, high:18, unit:"sq ft", label:"Glass Bead Finish" },
  excavation: { low:50, high:90, unit:"cu yd", label:"Excavation" },
  gunite: { low:180, high:280, unit:"cu yd", label:"Gunite / Shotcrete" },
  beach_entry: { low:3000, high:6000, unit:"unit", label:"Beach Entry" },
  baja_shelf: { low:1500, high:3500, unit:"unit", label:"Baja Shelf" },
  steps_corner: { low:800, high:1800, unit:"unit", label:"Corner Steps" },
  steps_end: { low:1200, high:2500, unit:"unit", label:"End Steps" },
  steps_curved: { low:2000, high:4500, unit:"unit", label:"Curved Steps" },
  swim_up_bar: { low:8000, high:18000, unit:"unit", label:"Swim-Up Bar" },
  grotto: { low:15000, high:40000, unit:"unit", label:"Grotto / Cave" },
  infinity_edge: { low:10000, high:25000, unit:"unit", label:"Infinity Edge" },
  spa_attached: { low:8000, high:20000, unit:"unit", label:"Attached Spa" },
  splash_pad: { low:5000, high:12000, unit:"unit", label:"Splash Pad" },
  diving_rock: { low:6000, high:18000, unit:"unit", label:"Diving Rock" },
  sun_shelf_umbrella: { low:800, high:2000, unit:"unit", label:"Sun Shelf w/ Sleeve" },
  concrete_deck: { low:8, high:18, unit:"sq ft", label:"Concrete Deck" },
  travertine: { low:18, high:35, unit:"sq ft", label:"Travertine Pavers" },
  cool_deck: { low:3, high:7, unit:"sq ft", label:"Kool Deck" },
  wood_composite: { low:20, high:40, unit:"sq ft", label:"Composite Decking" },
  fire_pit: { low:2500, high:8000, unit:"unit", label:"Fire Pit" },
  fire_bowls: { low:500, high:2000, unit:"unit", label:"Fire Bowls" },
  pergola: { low:5000, high:20000, unit:"unit", label:"Pergola" },
  retaining_wall: { low:30, high:80, unit:"linear ft", label:"Retaining Wall" },
  outdoor_kitchen: { low:8000, high:35000, unit:"unit", label:"Outdoor Kitchen" },
  landscape_beds: { low:5, high:15, unit:"sq ft", label:"Planting Beds" },
  fence: { low:25, high:60, unit:"linear ft", label:"Pool Fence" },
  putting_green: { low:15, high:40, unit:"sq ft", label:"Putting Green" },
  sport_court: { low:6, high:20, unit:"sq ft", label:"Sport Court" },
  bocce: { low:2000, high:6000, unit:"unit", label:"Bocce Court" },
};
function fmt(n) { if (!Number.isFinite(n)) return "—"; if (n >= 1000) return `$${(n/1000).toFixed(n%1000===0?0:1)}k`; return `$${n.toLocaleString()}`; }

function computeCostItems({ shape, len, wid, depthId, finishId, entries, hardscapes, extras, localRates, plasterConfig }) {
  len = Number.isFinite(len) && len > 0 ? len : 1;
  wid = Number.isFinite(wid) && wid > 0 ? wid : 1;
  const sf = {rectangle:1,oval:0.79,lshape:0.75,freeform:0.85,lap:1,greek:1,figure8:0.78}[shape]||1;
  const avgDepth = {shallow:3.5,standard:4.25,deep:4.75,diving:6}[depthId]||4.25;
  const footprint = len*wid*sf;
  const shell = footprint + 2*(len+wid)*avgDepth*sf;
  const excavCY = Math.round(footprint*avgDepth*1.2/27);
  const guniteCY = Math.round(shell*(4/12)/27);
  const finishSF = Math.round(shell);
  const mult = localRates?.multiplier || 1;
  const laborMult = localRates?.laborMultiplier || 1;

  const items = [];
  const excR = COST_RANGES.excavation;
  items.push({ cat:"Pool Structure", label:"Excavation", qty:excavCY, unit:"cu yd", low:excR.low*excavCY*mult, high:excR.high*excavCY*mult });
  const gunR = COST_RANGES.gunite;
  items.push({ cat:"Pool Structure", label:"Gunite / Shotcrete", qty:guniteCY, unit:"cu yd", low:gunR.low*guniteCY*mult, high:gunR.high*guniteCY*mult });
  const finR = COST_RANGES[finishId] || COST_RANGES.plaster;
  // If the plaster bag calculator (Materials tab) has a real cost/bag entered,
  // use that precise bag-based total instead of the generic $/sqft range -
  // same "Pool Structure" line item, just a more accurate source for its
  // cost once the user has supplied real supplier pricing. Not applying the
  // regional cost multiplier here: that multiplier scales generic baseline
  // estimates to local rates, but a user-entered actual bag price is already
  // the real local number, so re-multiplying it would double-adjust it.
  const bagCost = Number(plasterConfig?.costPerBag);
  let finishLabel = finR.label, finishLow, finishHigh;
  if (bagCost > 0) {
    const coverage = Number(plasterConfig.coveragePerBag) > 0 ? Number(plasterConfig.coveragePerBag) : 32;
    const waste = Number(plasterConfig.wasteFactor) || 0;
    const bagsNeeded = Math.ceil((finishSF * (1 + waste / 100)) / coverage);
    const totalCost = bagsNeeded * bagCost;
    finishLabel = `${finR.label} (${bagsNeeded} bags)`;
    finishLow = totalCost; finishHigh = totalCost;
  } else {
    finishLow = finR.low*finishSF*mult; finishHigh = finR.high*finishSF*mult;
  }
  items.push({ cat:"Pool Structure", label:finishLabel, qty:finishSF, unit:"sq ft", low:finishLow, high:finishHigh });
  items.push({ cat:"Pool Structure", label:"Plumbing, Steel & Misc", qty:1, unit:"allowance", low:4000*mult, high:9000*mult });

  Object.keys(entries).forEach(id => { const r = COST_RANGES[id]; if (r) items.push({ cat:"Entry & Features", label:r.label, qty:1, unit:"unit", low:r.low*mult, high:r.high*mult }); });
  Object.entries(hardscapes).forEach(([id,qty]) => {
    if (qty==null) return; const r = COST_RANGES[id]; if (!r) return;
    const q = r.unit==="unit" ? 1 : Number(qty)||1;
    items.push({ cat:"Hardscapes", label:r.label, qty:q, unit:r.unit, low:r.low*q*mult, high:r.high*q*mult });
  });

  items.push({ cat:"Equipment", label:"Variable Speed Pump", qty:1, unit:"unit", low:800*mult, high:1800*mult });
  items.push({ cat:"Equipment", label:"Pool Filter", qty:1, unit:"unit", low:600*mult, high:1400*mult });
  items.push({ cat:"Equipment", label:"Automation System", qty:1, unit:"unit", low:1500*mult, high:3500*mult });
  items.push({ cat:"Equipment", label:"LED Pool Lighting", qty:1, unit:"unit", low:400*mult, high:900*mult });
  if (extras?.sanitization==="salt") items.push({ cat:"Equipment", label:"Salt Chlorine System", qty:1, unit:"unit", low:700*mult, high:1800*mult });
  if (extras?.heater) items.push({ cat:"Equipment", label:"Pool Heater", qty:1, unit:"unit", low:2000*mult, high:4500*mult });

  const matLow = items.reduce((s,i)=>s+i.low,0);
  const matHigh = items.reduce((s,i)=>s+i.high,0);
  items.push({ cat:"Labor", label:"Installation Labor (est.)", qty:1, unit:"allowance", low:Math.round(matLow*0.38*laborMult), high:Math.round(matHigh*0.52*laborMult) });
  items.push({ cat:"Labor", label:"Permits, Engineering & Inspections", qty:1, unit:"allowance", low:2000*mult, high:6000*mult });

  const totalLow = items.reduce((s,i)=>s+i.low,0);
  const totalHigh = items.reduce((s,i)=>s+i.high,0);
  return { items, totalLow, totalHigh };
}

function CostEstimator({ shape, len, wid, depthId, finishId, colorId, entries, hardscapes, extras, localRates, setLocalRates, projectName, clientName, materials, plasterConfig, financingLinks=[] }) {
  const [expanded, setExpanded] = useState({});
  const [showLocalRates, setShowLocalRates] = useState(false);
  const toggleExp = (k) => setExpanded(p=>({...p,[k]:!p[k]}));

  const { items, totalLow, totalHigh } = computeCostItems({ shape, len, wid, depthId, finishId, entries, hardscapes, extras, localRates, plasterConfig });
  const sf = {rectangle:1,oval:0.79,lshape:0.75,freeform:0.85,lap:1,greek:1,figure8:0.78}[shape]||1;
  const mult = localRates?.multiplier || 1;
  const laborMult = localRates?.laborMultiplier || 1;

  const cats = [...new Set(items.map(i=>i.cat))];
  const catColors = { "Pool Structure":"#06b6d4", "Entry & Features":"#f59e0b", "Hardscapes":"#22c55e", "Equipment":"#8b5cf6", "Labor":"#94a3b8" };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",marginBottom:4}}>📊 {mult!==1||laborMult!==1?"Cost Ranges Adjusted to Your Local Rates":"Typical Cost Ranges - For Budgeting Reference Only"}</div>
        <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>{mult!==1||laborMult!==1?"You've customized these from national averages. Adjust further below.":"These are typical national cost ranges. Adjust to your local market below, or get 3 contractor quotes for exact pricing."}</div>
      </div>

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,overflow:"hidden"}}>
        <button onClick={()=>setShowLocalRates(p=>!p)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",textAlign:"left"}}>
          <span style={{fontSize:13,fontWeight:700,color:"#06b6d4"}}>⚙️ Adjust to Your Local Market</span>
          <span style={{color:"#64748b",fontSize:14}}>{showLocalRates?"▲":"▼"}</span>
        </button>
        {showLocalRates&&(
          <div style={{padding:"0 16px 16px",display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:11,color:"#64748b",lineHeight:1.6}}>National averages are a starting point. If your local material costs or labor rates run higher or lower, adjust the multipliers below — every number in this estimate updates instantly.</div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:12,color:"#94a3b8",fontWeight:600}}>Material & Equipment Costs</span>
                <span style={{fontSize:12,fontWeight:800,color:"#06b6d4"}}>{Math.round(mult*100)}% of national avg</span>
              </div>
              <input type="range" min="0.6" max="1.6" step="0.05" value={mult} onChange={e=>setLocalRates(p=>({...(p||{}),multiplier:Number(e.target.value)}))} style={{width:"100%",accentColor:"#c9a84c"}} />
            </div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:12,color:"#94a3b8",fontWeight:600}}>Local Labor Rates</span>
                <span style={{fontSize:12,fontWeight:800,color:"#f59e0b"}}>{Math.round(laborMult*100)}% of national avg</span>
              </div>
              <input type="range" min="0.6" max="1.8" step="0.05" value={laborMult} onChange={e=>setLocalRates(p=>({...(p||{}),laborMultiplier:Number(e.target.value)}))} style={{width:"100%",accentColor:"#f59e0b"}} />
            </div>
            {(mult!==1||laborMult!==1)&&<button onClick={()=>setLocalRates({multiplier:1,laborMultiplier:1})} style={{padding:"7px 14px",borderRadius:8,background:"rgba(100,116,139,0.1)",border:"1px solid #334155",color:"#94a3b8",fontSize:11,fontWeight:700,cursor:"pointer",alignSelf:"flex-start"}}>Reset to National Average</button>}
          </div>
        )}
      </div>

      <div style={{background:"linear-gradient(135deg,#0f2027,#1a3a4a)",border:"1px solid rgba(6,182,212,0.3)",borderRadius:16,padding:20,textAlign:"center"}}>
        <div style={{fontSize:12,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Estimated Total Project Range</div>
        <div style={{fontSize:36,fontWeight:900,color:"#06b6d4",letterSpacing:"-1px"}}>{fmt(totalLow)} – {fmt(totalHigh)}</div>
        <div style={{fontSize:12,color:"#64748b",marginTop:6}}>{len}'x{wid}' {POOL_SHAPES.find(s=>s.id===shape)?.label} - {POOL_FINISHES.find(f=>f.id===finishId)?.label} finish - {Object.keys(entries).length} features</div>
      </div>

      {financingLinks.length > 0 && (
        <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#22c55e",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>💳 Estimate Your Financing</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {financingLinks.map((f,i)=>(
              <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderRadius:10,background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.25)",textDecoration:"none"}}>
                <span style={{fontSize:13,fontWeight:700,color:"#22c55e"}}>{f.name}</span>
                <span style={{fontSize:16,color:"#22c55e"}}>→</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <button onClick={()=>generateProposal({ projectName, clientName, shape, len, wid, depthId, finishId, colorId, entries, hardscapes, materials, items, totalLow, totalHigh })}
        style={{width:"100%",padding:"15px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#7c3aed,#5b21b6)",color:"white",fontWeight:800,fontSize:14,cursor:"pointer",boxShadow:"0 4px 20px rgba(124,58,237,0.3)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        📑 Generate Client Proposal {clientName?`for ${clientName}`:""}
      </button>
      <div style={{fontSize:11,color:"#64748b",textAlign:"center",marginTop:-8}}>A polished, presentation-ready document for closing the sale — different from the internal Materials PDF.</div>

      {cats.map(cat => {
        const catItems = items.filter(i=>i.cat===cat);
        const catLow = catItems.reduce((s,i)=>s+i.low,0);
        const catHigh = catItems.reduce((s,i)=>s+i.high,0);
        const color = catColors[cat]||"#06b6d4";
        const pct = Math.round((catLow/totalLow)*100);
        return (
          <div key={cat} style={{background:"#111827",border:`1px solid #1e293b`,borderRadius:14,overflow:"hidden"}}>
            <button onClick={()=>toggleExp(cat)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"14px 16px",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color}}>{cat === "Pool Structure" ? "🏗️" : cat === "Entry & Features" ? "🏖️" : cat === "Hardscapes" ? "🧱" : cat === "Equipment" ? "⚙️" : "👷"} {cat}</div>
                <div style={{fontSize:12,color:"#64748b",marginTop:3}}>{fmt(catLow)} – {fmt(catHigh)} <span style={{color:"#334155"}}>- ~{pct}% of total</span></div>
              </div>
              <div style={{width:60,height:6,background:"#1e293b",borderRadius:3,overflow:"hidden",flexShrink:0}}><div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:3}} /></div>
              <span style={{color:"#64748b",fontSize:14}}>{expanded[cat]?"▲":"▼"}</span>
            </button>
            {expanded[cat] && (
              <div style={{borderTop:"1px solid #1e293b"}}>
                {catItems.map((item,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:"1px solid #0f172a"}}>
                  <div><div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{item.label}</div><div style={{fontSize:11,color:"#64748b",marginTop:2}}>{item.qty} {item.unit}</div></div>
                  <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:13,fontWeight:700,color}}>{fmt(item.low)} – {fmt(item.high)}</div></div>
                </div>))}
              </div>
            )}
          </div>
        );
      })}

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:12,padding:14,display:"flex",gap:0}}>
        {(() => {
          const footprintSf = len*wid*sf;
          const safeArea = footprintSf > 0 ? footprintSf : null;
          const gallonsBasis = Math.round(footprintSf*({shallow:3.5,standard:4.25,deep:4.75,diving:6}[depthId]||4.25)*7.48);
          const safeGallons = gallonsBasis > 0 ? gallonsBasis : null;
          return [
            { label:"Cost Per Gallon", val: safeGallons ? `${fmt(Math.round(totalLow/safeGallons))} – ${fmt(Math.round(totalHigh/safeGallons))}` : "—" },
            { label:"Cost Per Sq Ft", val: safeArea ? `${fmt(Math.round(totalLow/safeArea))} – ${fmt(Math.round(totalHigh/safeArea))}` : "—" },
            { label:"Midpoint Est.", val:fmt(Math.round((totalLow+totalHigh)/2)) },
          ];
        })().map((s,i)=>(
          <div key={i} style={{flex:1,textAlign:"center",borderRight:i<2?"1px solid #1e293b":"none",padding:"0 8px"}}>
            <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:13,fontWeight:800,color:"#06b6d4"}}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:11,color:"#334155",textAlign:"center",lineHeight:1.6}}>{mult!==1||laborMult!==1?"Adjusted from national base rates using your local multipliers above.":"Ranges based on typical US market rates. Get local contractor quotes for accurate pricing."}</div>
    </div>
  );
}

// ─── SHARE DESIGN ──────────────────────────────────────────────────────────────
function ShareDesign({ projectName, clientName, clientEmail, clientPhone, shape, len, wid, depthId, finishId, colorId, entries, hardscapes, materials, onClose }) {
  const [copied, setCopied] = useState(false);
  const finishLabel = POOL_FINISHES.find(f=>f.id===finishId)?.label||finishId;
  const colorLabel = POOL_COLORS.find(c=>c.id===colorId)?.label||colorId;
  const shapeLabel = POOL_SHAPES.find(s=>s.id===shape)?.label||shape;
  const depthLabel = DEPTHS.find(d=>d.id===depthId)?.label||depthId;
  const activeEntries = ENTRY_FEATURES.filter(e=>entries[e.id]);
  const activeHardscapes = HARDSCAPE_OPTIONS.filter(h=>hardscapes[h.id]!=null);
  const hasContact = !!(clientEmail || clientPhone);

  const summaryText = `${clientName?`Hi ${clientName.split(/[\s&]/)[0]},\n\nHere's a summary of your pool design from Pool Craft Pro:\n\n`:""}Pool Craft Pro Design Summary\n------------------------\nProject: ${projectName}\n\nPOOL DESIGN\n- Shape: ${shapeLabel}\n- Size: ${len}' x ${wid}'\n- Depth: ${depthLabel}\n- Water Color: ${colorLabel}\n- Finish: ${finishLabel}\n- Volume: ${materials.gallons.toLocaleString()} gallons\n\nMATERIAL QUANTITIES\n- Excavation: ${materials.excavation}\n- Gunite/Shotcrete: ${materials.gunite}\n- Rebar: ${materials.rebar}\n- PVC Plumbing: ${materials.plumbing}\n- Coping: ${materials.coping}\n- Interior Finish: ${materials.finish}\n${activeEntries.length>0?`\nPOOL FEATURES\n${activeEntries.map(e=>`- ${e.label}`).join("\n")}`:""}${activeHardscapes.length>0?`\n\nHARDSCAPES\n${activeHardscapes.map(h=>`- ${h.label}${h.unit!=="unit"?` (${hardscapes[h.id]} ${h.unit})`:""}`).join("\n")}`:""}`;

  const copyToClipboard = () => {
    try { navigator.clipboard.writeText(summaryText).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2500); }); }
    catch { const ta=document.createElement("textarea"); ta.value=summaryText; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); setCopied(true); setTimeout(()=>setCopied(false),2500); }
  };
  const shareVia = (method, direct=false) => {
    const encoded = encodeURIComponent(summaryText);
    const phoneDigits = (clientPhone||"").replace(/[^0-9+]/g,"");
    const urls = {
      sms: direct&&phoneDigits ? `sms:${phoneDigits}?body=${encoded}` : `sms:?body=${encoded}`,
      email: direct&&clientEmail ? `mailto:${clientEmail}?subject=${encodeURIComponent(`Your Pool Design: ${projectName}`)}&body=${encoded}` : `mailto:?subject=${encodeURIComponent(`Pool Design: ${projectName}`)}&body=${encoded}`,
      whatsapp: `https://wa.me/${direct&&phoneDigits?phoneDigits.replace("+",""):""}?text=${encoded}`,
    };
    if (urls[method]) window.open(urls[method],"_blank");
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:500,maxHeight:"85vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"18px 20px 14px",borderBottom:"1px solid #1e293b",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:800,color:"#e2e8f0"}}>📤 Share Design</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",fontSize:22,cursor:"pointer",padding:10,margin:-10,minWidth:44,minHeight:44}}>✕</button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:16,display:"flex",flexDirection:"column",gap:12}}>
          {hasContact && (
            <div style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:12,padding:14}}>
              <div style={{fontSize:11,color:"#22c55e",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>Send directly to {clientName||"client"}</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {clientEmail && <button onClick={()=>shareVia("email",true)} style={{flex:1,minWidth:140,padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>📧 Email {clientEmail}</button>}
                {clientPhone && <button onClick={()=>shareVia("sms",true)} style={{flex:1,minWidth:140,padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>💬 Text {clientPhone}</button>}
              </div>
            </div>
          )}
          <div>
            <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>{hasContact?"Or share another way":"Share Via"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
              {[{id:"copy",icon:"📋",label:"Copy",action:copyToClipboard},{id:"sms",icon:"💬",label:"Text",action:()=>shareVia("sms")},{id:"email",icon:"📧",label:"Email",action:()=>shareVia("email")},{id:"whatsapp",icon:"💚",label:"WhatsApp",action:()=>shareVia("whatsapp")}].map(btn=>(
                <button key={btn.id} onClick={btn.action} style={{padding:"12px 8px",borderRadius:12,border:"1px solid #334155",background:copied&&btn.id==="copy"?"rgba(34,197,94,0.15)":"#0f172a",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,transition:"all 0.15s"}}>
                  <span style={{fontSize:22}}>{btn.icon}</span><span style={{fontSize:11,fontWeight:700,color:copied&&btn.id==="copy"?"#22c55e":"#94a3b8"}}>{btn.id==="copy"&&copied?"Copied!":btn.label}</span>
                </button>
              ))}
            </div>
          </div>
          {typeof navigator.share !== "undefined" && (<button onClick={()=>navigator.share({title:`Pool Design: ${projectName}`,text:summaryText})} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#06b6d4,#0284c7)",color:"white",fontWeight:800,fontSize:14,cursor:"pointer"}}>📱 Share via Phone / System Share</button>)}
          <div>
            <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Design Summary Preview</div>
            <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:14,fontFamily:"monospace",fontSize:11,color:"#94a3b8",lineHeight:1.7,whiteSpace:"pre-wrap",maxHeight:240,overflowY:"auto"}}>{summaryText}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function OnboardingModal({ onComplete, userMode, setUserMode, setLen, setWid, setShape, setDepthId, setFinishId }) {
  const [step, setStep] = useState(0);
  const [demoLen, setDemoLen] = useState(30);
  const [demoWid, setDemoWid] = useState(15);
  const [demoShape, setDemoShape] = useState("rectangle");
  const [demoDepth, setDemoDepth] = useState("standard");
  const [demoFinish, setDemoFinish] = useState("pebble");

  const steps = [
    // Step 0: Welcome
    { icon: null, title:"Welcome to Pool Craft Pro", subtitle:"Design Pools. Craft Outdoor Living.", content:(
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{textAlign:"center",marginBottom:4}}>
          <svg viewBox="0 0 52 42" width="56" height="44" style={{margin:"0 auto 12px",display:"block"}}>
            <defs>
              <linearGradient id="oN" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6aaee8"/><stop offset="100%" stopColor="#1a2f5e"/></linearGradient>
              <linearGradient id="oG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#e8c96a"/><stop offset="100%" stopColor="#a8873a"/></linearGradient>
              <linearGradient id="oD" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6aaee8"/><stop offset="100%" stopColor="#1a5fa8"/></linearGradient>
            </defs>
            <text x="0" y="34" fontFamily="Georgia,serif" fontWeight="700" fontSize="34" fill="url(#oN)">F</text>
            <path d="M 26 1 C 26 1,18 14,18 20 C 18 26 21.5 30 26 30 C 30.5 30 34 26 34 20 C 34 14 26 1 26 1 Z" fill="url(#oD)"/>
            <ellipse cx="23" cy="15" rx="2.5" ry="4" fill="white" opacity="0.4" transform="rotate(-15 23 15)"/>
            <text x="30" y="34" fontFamily="Georgia,serif" fontWeight="700" fontSize="34" fill="url(#oG)">P</text>
          </svg>
          <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.7}}>The most complete pool design tool ever built for contractors and homeowners. Design, estimate, render, and close — all in one place.</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
          {[{icon:"⚡",label:"AI Renderings",sub:"FLUX (fal.ai)"},{icon:"📊",label:"Materials Calc",sub:"Real engineering math"},{icon:"🗺️",label:"Site Plan",sub:"Scale-accurate map"},{icon:"💰",label:"Cost Estimator",sub:"Local market rates"},{icon:"📄",label:"Client Proposals",sub:"Close the deal"},{icon:"🏗️",label:"Build Tracker",sub:"Post-sale tool"}].map(f=>(
            <div key={f.label} style={{background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.18)",borderRadius:10,padding:"10px 12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}><span style={{fontSize:18}}>{f.icon}</span><span style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{f.label}</span></div>
              <div style={{fontSize:10,color:"#64748b",paddingLeft:26}}>{f.sub}</div>
            </div>
          ))}
        </div>
      </div>
    )},
    // Step 1: Who are you
    { icon:"👤", title:"Who's designing today?", subtitle:"We'll tailor the experience for you", content:(
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[{id:"contractor",icon:"👷",title:"Pool Contractor / Builder",desc:"Full technical detail — specs, permits, client quotes, build tracking"},{id:"homeowner",icon:"🏠",title:"Homeowner / DIY",desc:"Guided visual design — easy material lists, contractor comparison"},{id:"designer",icon:"🎨",title:"Landscape Designer",desc:"Visual design focus — yard planning, hardscapes, AI renderings"}].map(m=>(
          <button key={m.id} onClick={()=>setUserMode(m.id)} style={{textAlign:"left",padding:"14px 16px",borderRadius:12,border:`2px solid ${userMode===m.id?"#c9a84c":"#1e293b"}`,background:userMode===m.id?"rgba(201,168,76,0.08)":"#0f172a",cursor:"pointer",display:"flex",gap:14,alignItems:"flex-start",transition:"all 0.15s"}}>
            <span style={{fontSize:28,flexShrink:0}}>{m.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:14,color:userMode===m.id?"#c9a84c":"#e2e8f0",marginBottom:3}}>{m.title}</div>
              <div style={{fontSize:12,color:"#64748b",lineHeight:1.5}}>{m.desc}</div>
            </div>
            {userMode===m.id&&<span style={{color:"#c9a84c",fontSize:18,flexShrink:0}}>✓</span>}
          </button>
        ))}
      </div>
    )},
    // Step 2: Design your first pool (guided)
    { icon:"🏊", title:"Design your first pool", subtitle:"Adjust below — you can change everything later", content:(
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:14}}>
          <div style={{fontSize:11,color:"#c9a84c",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>Shape</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {POOL_SHAPES.map(s=>(
              <button key={s.id} onClick={()=>setDemoShape(s.id)} style={{padding:"7px 12px",borderRadius:20,border:`2px solid ${demoShape===s.id?"#c9a84c":"#334155"}`,background:demoShape===s.id?"rgba(201,168,76,0.1)":"transparent",color:demoShape===s.id?"#c9a84c":"#64748b",fontSize:12,fontWeight:600,cursor:"pointer"}}>{s.label}</button>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[{label:"Length (ft)",val:demoLen,set:setDemoLen,min:10,max:120},{label:"Width (ft)",val:demoWid,set:setDemoWid,min:8,max:60}].map(f=>(
            <div key={f.label} style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:12}}>
              <div style={{fontSize:11,color:"#c9a84c",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>{f.label}</div>
              <div style={{fontSize:24,fontWeight:900,color:"#e2e8f0",textAlign:"center",marginBottom:6}}>{f.val}′</div>
              <input type="range" min={f.min} max={f.max} value={f.val} onChange={e=>f.set(Number(e.target.value))} style={{width:"100%",accentColor:"#c9a84c"}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#334155",marginTop:2}}><span>{f.min}′</span><span>{f.max}′</span></div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:12}}>
            <div style={{fontSize:11,color:"#c9a84c",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Depth</div>
            {DEPTHS.map(d=>(
              <button key={d.id} onClick={()=>setDemoDepth(d.id)} style={{display:"block",width:"100%",textAlign:"left",padding:"7px 10px",borderRadius:8,border:`1px solid ${demoDepth===d.id?"#c9a84c":"transparent"}`,background:demoDepth===d.id?"rgba(201,168,76,0.08)":"transparent",color:demoDepth===d.id?"#c9a84c":"#64748b",fontSize:12,fontWeight:600,cursor:"pointer",marginBottom:3}}>{d.label}</button>
            ))}
          </div>
          <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:12}}>
            <div style={{fontSize:11,color:"#c9a84c",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Finish</div>
            {POOL_FINISHES.slice(0,4).map(f=>(
              <button key={f.id} onClick={()=>setDemoFinish(f.id)} style={{display:"block",width:"100%",textAlign:"left",padding:"7px 10px",borderRadius:8,border:`1px solid ${demoFinish===f.id?"#c9a84c":"transparent"}`,background:demoFinish===f.id?"rgba(201,168,76,0.08)":"transparent",color:demoFinish===f.id?"#c9a84c":"#64748b",fontSize:12,fontWeight:600,cursor:"pointer",marginBottom:3}}>{f.label}</button>
            ))}
          </div>
        </div>
        <div style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:10,padding:10,fontSize:12,color:"#22c55e",display:"flex",gap:8,alignItems:"center"}}>
          <span>✓</span><span>Your {demoLen}′×{demoWid}′ {POOL_SHAPES.find(s=>s.id===demoShape)?.label} pool is ready — click Next to apply these settings</span>
        </div>
      </div>
    )},
    // Step 3: Cloud sync
    { icon:"☁️", title:"Sync across all devices", subtitle:"Optional — set up later anytime from Settings", content:(
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:12,padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:"#22c55e",marginBottom:6}}>☁️ Cloud Sync via Supabase (Free)</div>
          <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.7}}>By default, projects save only to this device. Connect a free Supabase database (5 minutes, one time) and your projects follow you to any iPhone, iPad, or computer.</div>
        </div>
        <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:14,fontSize:12,color:"#64748b",lineHeight:1.7}}>
          <div style={{fontWeight:700,color:"#94a3b8",marginBottom:6}}>To set up cloud sync:</div>
          {["Go to supabase.com — create a free project","Run the setup SQL (in your Settings tab → Cloud Sync)","Paste your project URL and anon key in Settings"].map((s,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:4}}><span style={{color:"#c9a84c",flexShrink:0}}>{i+1}.</span>{s}</div>
          ))}
        </div>
        <div style={{fontSize:12,color:"#64748b",textAlign:"center"}}>You can skip this now and set it up later from the Settings tab ⚙️</div>
      </div>
    )},
    // Step 4: Ready
    { icon:"✅", title:"You're all set!", subtitle:"Your pool design is loaded and ready", content:(
      <div style={{display:"flex",flexDirection:"column",gap:14,alignItems:"center"}}>
        <div style={{background:"linear-gradient(135deg,rgba(201,168,76,0.12),rgba(168,135,58,0.06))",border:"1px solid rgba(201,168,76,0.25)",borderRadius:14,padding:20,width:"100%",textAlign:"center"}}>
          <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:700,color:"#e2e8f0",marginBottom:4}}>{demoLen}′ × {demoWid}′ {POOL_SHAPES.find(s=>s.id===demoShape)?.label}</div>
          <div style={{fontSize:13,color:"#c9a84c"}}>{POOL_FINISHES.find(f=>f.id===demoFinish)?.label} Finish · {DEPTHS.find(d=>d.id===demoDepth)?.label}</div>
        </div>
        <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:14,width:"100%"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:10}}>Quick tips to get started:</div>
          {[{icon:"🏊",tip:"Use the 3D preview on the Design tab — drag to rotate it"},{icon:"⚡",tip:"Try Quick Render — stand in a backyard and render your pool live"},{icon:"💰",tip:"Cost Est. tab builds a client proposal with one tap"},{icon:"📂",tip:"Save projects with client names using the 💾 button above"},{icon:"🔧",tip:"Subscribe to a Basic or Pro plan in Settings to unlock AI photo rendering"}].map((t,i)=>(
            <div key={i} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
              <span style={{fontSize:16,flexShrink:0}}>{t.icon}</span>
              <span style={{fontSize:12,color:"#64748b",lineHeight:1.5}}>{t.tip}</span>
            </div>
          ))}
        </div>
      </div>
    )},
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      // Apply the guided design settings
      setLen(demoLen); setWid(demoWid); setShape(demoShape);
      setDepthId(demoDepth); setFinishId(demoFinish);
      try { localStorage.setItem("pc_mode", userMode); localStorage.setItem("pc_onboarded","1"); } catch {}
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:20,width:"100%",maxWidth:500,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.6)",maxHeight:"92vh",display:"flex",flexDirection:"column"}}>
        {/* Progress bar */}
        <div style={{height:3,background:"#1e293b",flexShrink:0}}>
          <div style={{height:"100%",width:`${((step+1)/steps.length)*100}%`,background:"linear-gradient(90deg,#c9a84c,#e8c96a)",transition:"width 0.4s"}} />
        </div>
        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#0a0f1e,#0f1e3d)",padding:"24px 24px 20px",textAlign:"center",flexShrink:0}}>
          {current.icon && <div style={{fontSize:44,marginBottom:10}}>{current.icon}</div>}
          <div style={{fontSize:18,fontWeight:800,color:"#e2e8f0",marginBottom:4,fontFamily:"Georgia,serif"}}>{current.title}</div>
          <div style={{fontSize:12,color:"#64748b"}}>{current.subtitle}</div>
        </div>
        {/* Content */}
        <div style={{padding:20,overflowY:"auto",flex:1}}>{current.content}</div>
        {/* Actions */}
        <div style={{padding:"0 20px 20px",display:"flex",gap:10,flexShrink:0}}>
          {step > 0 && <button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"13px",borderRadius:10,border:"1px solid #334155",background:"#1e293b",color:"#94a3b8",fontWeight:700,fontSize:14,cursor:"pointer"}}>← Back</button>}
          <button onClick={handleNext} style={{flex:2,padding:"13px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#c9a84c,#a8873a)",color:"#0a0f1e",fontWeight:800,fontSize:14,cursor:"pointer"}}>
            {isLast ? "Start Designing 🏊" : step === 2 ? "Apply My Pool →" : "Next →"}
          </button>
        </div>
        {!isLast && <div style={{textAlign:"center",paddingBottom:16,flexShrink:0}}><button onClick={()=>{ try{localStorage.setItem("pc_onboarded","1");}catch{} onComplete(); }} style={{background:"none",border:"none",color:"#334155",fontSize:12,cursor:"pointer"}}>Skip setup</button></div>}
      </div>
    </div>
  );
}

// ─── PROJECT MANAGER (cloud-aware) ─────────────────────────────────────────────
function ProjectManager({ currentProjectId, onLoad, onClose }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [renamingClient, setRenamingClient] = useState(null);
  const cloudConnected = !!(getSupabaseConfig().url && getSupabaseConfig().key);

  const refresh = async () => { setLoading(true); const list = await listProjects(); setProjects(list); setLoading(false); };
  useEffect(() => { refresh(); }, []);

  const deleteProject = async (id) => { await deleteProjectRecord(id); setConfirmDelete(null); refresh(); };

  const setProjectClient = async (project, clientName) => {
    const updated = { ...project, clientName: clientName.trim() || null };
    await saveProjectRecord(updated);
    refresh();
  };

  const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "";
  const filtered = search.trim()
    ? projects.filter(p=>(p.name||"").toLowerCase().includes(search.toLowerCase()) || (p.clientName||"").toLowerCase().includes(search.toLowerCase()))
    : projects;

  // Group by client name. Anything without a client goes in "Unassigned".
  const groups = {};
  filtered.forEach(p => {
    const key = p.clientName?.trim() || "Unassigned";
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  const groupNames = Object.keys(groups).sort((a,b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });

  const toggleCollapsed = (name) => setCollapsed(p => ({ ...p, [name]: !p[name] }));

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:0}}>
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:520,maxHeight:"82vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"18px 20px",borderBottom:"1px solid #1e293b"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:15,fontWeight:800,color:"#e2e8f0",display:"flex",alignItems:"center",gap:8}}>
              📂 Projects {cloudConnected&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",fontWeight:700}}>☁️ Synced</span>}
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",fontSize:22,cursor:"pointer",padding:10,margin:-10,minWidth:44,minHeight:44}}>✕</button>
          </div>
          {projects.length>3&&(<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search by project or client name..." style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"9px 12px",color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}} />)}
        </div>
        <div style={{overflowY:"auto",flex:1,padding:16}}>
          {loading ? (
            <div style={{textAlign:"center",padding:"40px 20px",color:"#64748b",fontSize:13}}>Loading projects...</div>
          ) : filtered.length === 0 ? (
            <div style={{textAlign:"center",padding:"40px 20px"}}>
              <div style={{fontSize:40,marginBottom:10}}>📂</div>
              <div style={{fontSize:14,color:"#64748b"}}>{search?"No projects match your search":"No saved projects yet"}</div>
              <div style={{fontSize:12,color:"#334155",marginTop:6}}>Use the Save button to store your current design</div>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {groupNames.map(clientName => {
                const isUnassigned = clientName === "Unassigned";
                const projectsInGroup = groups[clientName];
                const isCollapsed = collapsed[clientName];
                return (
                  <div key={clientName}>
                    <button onClick={()=>toggleCollapsed(clientName)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,padding:"4px 0 8px",textAlign:"left"}}>
                      <span style={{color:"#64748b",fontSize:11}}>{isCollapsed?"▶":"▼"}</span>
                      <span style={{fontSize:12,fontWeight:800,color:isUnassigned?"#64748b":"#06b6d4",textTransform:"uppercase",letterSpacing:"0.06em"}}>
                        {isUnassigned?"👤 Unassigned":`👤 ${clientName}`}
                      </span>
                      <span style={{fontSize:11,color:"#334155",fontWeight:600}}>({projectsInGroup.length})</span>
                    </button>
                    {!isCollapsed && (
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        {projectsInGroup.map(p=>(
                          <div key={p.id} style={{background:String(p.id)===String(currentProjectId)?"rgba(6,182,212,0.07)":"#0f172a",border:`1px solid ${String(p.id)===String(currentProjectId)?"rgba(6,182,212,0.3)":"#1e293b"}`,borderRadius:12,padding:14}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontWeight:700,fontSize:14,color:"#e2e8f0",marginBottom:4}}>{p.name}{String(p.id)===String(currentProjectId)&&<span style={{fontSize:10,color:"#06b6d4",fontWeight:700,marginLeft:8}}>● CURRENT</span>}</div>
                                <div style={{fontSize:11,color:"#64748b",marginBottom:6}}>{formatDate(p.savedAt)} - {p.shape} {p.len}'x{p.wid}' - {p.gallons?.toLocaleString()} gal</div>
                                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                  {p.entryCount>0&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.2)",color:"#06b6d4"}}>{p.entryCount} features</span>}
                                  {p.hardscapeCount>0&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.2)",color:"#f59e0b"}}>{p.hardscapeCount} hardscapes</span>}
                                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.2)",color:"#22c55e"}}>{p.finish}</span>
                                </div>
                                {renamingClient===p.id ? (
                                  <div style={{display:"flex",gap:6,marginTop:8}}>
                                    <input autoFocus defaultValue={p.clientName||""} onKeyDown={e=>{ if(e.key==="Enter"){ setProjectClient(p, e.target.value); setRenamingClient(null);} if(e.key==="Escape") setRenamingClient(null); }} placeholder="Client name..." style={{flex:1,background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"9px 10px",minHeight:38,color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}} id={`client-input-${p.id}`} />
                                    <button onClick={()=>{ const el=document.getElementById(`client-input-${p.id}`); setProjectClient(p, el?el.value:""); setRenamingClient(null); }} style={{padding:"9px 14px",minHeight:38,borderRadius:8,background:"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button>
                                  </div>
                                ) : (
                                  <button onClick={()=>setRenamingClient(p.id)} style={{marginTop:8,fontSize:11,color:"#64748b",background:"none",border:"none",cursor:"pointer",padding:"8px 0",minHeight:36}}>{p.clientName?`✏️ Reassign client`:"+ Assign to a client"}</button>
                                )}
                              </div>
                              <div style={{display:"flex",gap:6,flexShrink:0}}>
                                <button onClick={()=>onLoad(p)} style={{padding:"9px 16px",minHeight:40,borderRadius:8,border:"none",background:"linear-gradient(135deg,#06b6d4,#0284c7)",color:"white",fontWeight:700,fontSize:12,cursor:"pointer"}}>Load</button>
                                {confirmDelete===p.id ? (<button onClick={()=>deleteProject(p.id)} style={{padding:"9px 14px",minHeight:40,borderRadius:8,border:"1px solid rgba(239,68,68,0.4)",background:"rgba(239,68,68,0.15)",color:"#ef4444",fontWeight:700,fontSize:12,cursor:"pointer"}}>Confirm</button>) : (<button onClick={()=>setConfirmDelete(p.id)} style={{width:40,height:40,borderRadius:8,border:"1px solid #334155",background:"#1e293b",color:"#64748b",fontWeight:700,fontSize:14,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑</button>)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {!cloudConnected&&projects.length>0&&(
          <div style={{padding:"10px 16px",borderTop:"1px solid #1e293b",fontSize:11,color:"#64748b",textAlign:"center"}}>💡 These projects are saved to this device only. Connect Cloud Sync on the Design tab to access them anywhere.</div>
        )}
      </div>
    </div>
  );
}

// ─── PDF EXPORT ────────────────────────────────────────────────────────────────
function generatePDF({ projectName, shape, len, wid, depthId, finishId, colorId, materials, equipment, entries, hardscapes, parcelData }) {
  const finishLabel = POOL_FINISHES.find(f=>f.id===finishId)?.label || finishId;
  const colorLabel = POOL_COLORS.find(c=>c.id===colorId)?.label || colorId;
  const depthLabel = DEPTHS.find(d=>d.id===depthId)?.label || depthId;
  const shapeLabel = POOL_SHAPES.find(s=>s.id===shape)?.label || shape;
  const activeEntries = ENTRY_FEATURES.filter(e=>entries[e.id]);
  const activeHardscapes = HARDSCAPE_OPTIONS.filter(h=>hardscapes[h.id]!=null);
  const date = new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  const win = window.open("","_blank"); if (!win) { alert("Please allow pop-ups for this site to export or print."); return; }
  win.document.write(`<!DOCTYPE html><html><head><title>Pool Craft Pro — ${escapeHtml(projectName)}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#fff;color:#1e293b;padding:40px}.header{background:linear-gradient(135deg,#0f2027,#203a43);color:white;padding:32px;border-radius:12px;margin-bottom:28px}.logo{font-size:24px;font-weight:800;margin-bottom:4px}.project-name{font-size:20px;font-weight:800;margin:12px 0 4px}.section{margin-bottom:24px}.section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#06b6d4;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}.card-label{font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:3px}.card-value{font-size:15px;font-weight:800;color:#0f172a}.material-row{display:flex;justify-content:space-between;padding:9px 12px;border-bottom:1px solid #f1f5f9}.eq-row{display:flex;justify-content:space-between;align-items:flex-start;padding:9px 12px;border-bottom:1px solid #f1f5f9}.chip{display:inline-block;padding:3px 10px;border-radius:20px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-size:12px;font-weight:600;margin:3px}.footer{margin-top:36px;padding-top:18px;border-top:2px solid #e2e8f0;font-size:11px;color:#94a3b8}@media print{body{padding:20px}}</style></head><body>
  <div class="header"><div class="logo"><strong style="font-size:18px;color:#1a2f5e;font-family:Georgia,serif;letter-spacing:2px">POOL <span style="color:#c9a84c">CRAFT</span> PRO</strong><br><span style="font-size:11px;color:#94a3b8">Design Pools. Craft Outdoor Living.<</div><div class="project-name">${escapeHtml(projectName)}</div><div style="font-size:12px;color:#94a3b8">Generated ${date}</div>${parcelData?`<div style="font-size:12px;color:#94a3b8;margin-top:6px">📍 ${escapeHtml(parcelData.address)}</div>`:""}</div>
  <div class="section"><div class="section-title">Pool Design Summary</div><div class="grid-2"><div class="card"><div class="card-label">Size</div><div class="card-value">${len}' x ${wid}'</div></div><div class="card"><div class="card-label">Shape</div><div class="card-value">${shapeLabel}</div></div><div class="card"><div class="card-label">Depth Profile</div><div class="card-value" style="font-size:13px">${depthLabel}</div></div><div class="card"><div class="card-label">Volume</div><div class="card-value">${materials.gallons.toLocaleString()} gal</div></div><div class="card"><div class="card-label">Water Color</div><div class="card-value" style="font-size:13px">${colorLabel}</div></div><div class="card"><div class="card-label">Finish</div><div class="card-value" style="font-size:13px">${finishLabel}</div></div></div></div>
  ${activeEntries.length>0?`<div class="section"><div class="section-title">Pool Features & Entry</div><div>${activeEntries.map(e=>`<span class="chip">${e.icon} ${e.label}</span>`).join("")}</div></div>`:""}
  <div class="section"><div class="section-title">Materials Takeoff</div><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">${[{l:"Excavation",v:materials.excavation},{l:"Gunite / Shotcrete",v:materials.gunite},{l:"Rebar (#3)",v:materials.rebar},{l:"Gravel Base",v:materials.gravel},{l:"PVC Plumbing",v:materials.plumbing},{l:"Coping",v:materials.coping},{l:"Interior Finish",v:materials.finish}].map(r=>`<div class="material-row"><span style="font-weight:600">${r.l}</span><span style="font-weight:800;color:#0284c7">${r.v}</span></div>`).join("")}</div></div>
  ${activeHardscapes.length>0?`<div class="section"><div class="section-title">Hardscape Elements</div><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">${activeHardscapes.map(h=>`<div class="material-row"><span style="font-weight:600">${h.icon} ${h.label}</span><span style="font-weight:800;color:#0284c7">${h.unit==="unit"?"1 unit":`${hardscapes[h.id]} ${h.unit}`}</span></div>`).join("")}</div></div>`:""}
  <div class="section"><div class="section-title">Recommended Pentair Equipment</div><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">${equipment.map(eq=>`<div class="eq-row"><div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase">${eq.label}</div><div style="font-size:13px;font-weight:700;margin-top:2px">${eq.model}</div><div style="font-size:11px;color:#64748b;margin-top:2px">${eq.note}</div></div><div style="font-size:11px;font-family:monospace;background:#e2e8f0;padding:2px 8px;border-radius:6px;white-space:nowrap">${eq.sku}</div></div>`).join("")}</div></div>
  <div class="footer">Pool Craft Pro — Design Pools. Craft Outdoor Living.<br>All material quantities are estimates. Verify with your licensed pool contractor. Always obtain proper permits before construction.</div>
  <script>window.onload=()=>setTimeout(()=>window.print(),800);</script></body></html>`);
  win.document.close();
}

// ─── CLIENT PROPOSAL (sales-facing document) ──────────────────────────────────
// Distinct from generatePDF: this is meant to be shown to or emailed directly
// to the client to close the sale, not an internal materials/build reference.
function generateProposal({ projectName, clientName, shape, len, wid, depthId, finishId, colorId, entries, hardscapes, materials, items, totalLow, totalHigh }) {
  const shapeLabel = POOL_SHAPES.find(s=>s.id===shape)?.label || shape;
  const finishLabel = POOL_FINISHES.find(f=>f.id===finishId)?.label || finishId;
  const depthLabel = DEPTHS.find(d=>d.id===depthId)?.label || depthId;
  const colorLabel = POOL_COLORS.find(c=>c.id===colorId)?.label || "Crystal Blue";
  const activeEntries = ENTRY_FEATURES.filter(e=>entries[e.id]);
  const activeHardscapes = HARDSCAPE_OPTIONS.filter(h=>hardscapes[h.id]!=null);
  const date = new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  const validUntil = new Date(Date.now()+30*24*60*60*1000).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  const cats = [...new Set(items.map(i=>i.cat))];
  const catLabels = { "Pool Structure":"Pool Construction", "Entry & Features":"Pool Features & Entries", "Hardscapes":"Outdoor Living & Hardscapes", "Equipment":"Equipment Package", "Labor":"Labor, Permits & Engineering" };

  const win = window.open("","_blank"); if (!win) { alert("Please allow pop-ups for this site to export or print."); return; }
  win.document.write(`<!DOCTYPE html><html><head><title>Pool Proposal — ${escapeHtml(clientName || projectName)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:"Inter",system-ui,sans-serif;background:#fff;color:#1e293b;line-height:1.5;-webkit-font-smoothing:antialiased}
    /* ── COVER ── */
    .cover{background:linear-gradient(145deg,#0a0f1e 0%,#0f1e3d 55%,#0a0f1e 100%);color:white;padding:64px 56px 72px;min-height:320px;position:relative;overflow:hidden}
    .cover::before{content:'';position:absolute;top:-30%;right:-10%;width:60%;height:160%;background:radial-gradient(ellipse,rgba(201,168,76,0.12) 0%,transparent 70%);pointer-events:none}
    .cover-logo{display:flex;align-items:center;gap:14px;margin-bottom:52px}
    .cover-logo-badge{width:52px;height:52px;border-radius:13px;background:linear-gradient(135deg,#1a2f5e,#0f1e3d);border:1px solid rgba(201,168,76,0.4);display:flex;align-items:center;justify-content:center}
    .cover-wordmark{font-family:"Cormorant Garamond",Georgia,serif;font-size:22px;font-weight:600;letter-spacing:3px;line-height:1.1}
    .cover-wordmark span{color:#c9a84c}
    .cover-tagline{font-size:10px;color:#8a9ab5;letter-spacing:2.5px;text-transform:uppercase;margin-top:3px;font-family:"Inter",sans-serif}
    .cover h1{font-family:"Cormorant Garamond",Georgia,serif;font-size:44px;font-weight:300;line-height:1.15;margin-bottom:16px;letter-spacing:-0.5px}
    .cover-for{font-size:12px;color:#8a9ab5;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px}
    .cover-client{font-family:"Cormorant Garamond",Georgia,serif;font-size:26px;font-weight:400;color:#e8c96a;margin-bottom:24px}
    .cover-meta{font-size:12px;color:#64748b;display:flex;gap:20px;flex-wrap:wrap}
    .cover-meta span{display:flex;align-items:center;gap:6px}
    .cover-divider{width:48px;height:1px;background:rgba(201,168,76,0.4);margin:28px 0}
    /* ── BODY ── */
    .body{padding:52px 56px}
    .section{margin-bottom:40px}
    .section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#c9a84c;margin-bottom:16px;display:flex;align-items:center;gap:10px}
    .section-label::after{content:'';flex:1;height:1px;background:#e2e8f0}
    /* ── SPEC GRID ── */
    .spec-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .spec{background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #f1f5f9}
    .spec label{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:6px;font-weight:600}
    .spec span{font-family:"Cormorant Garamond",Georgia,serif;font-size:20px;font-weight:600;color:#0f172a;line-height:1.2}
    /* ── HIGHLIGHTS ── */
    .highlight-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:4px}
    .highlight{background:linear-gradient(135deg,#0a0f1e,#0f1e3d);border-radius:10px;padding:16px;text-align:center;border:1px solid rgba(201,168,76,0.15)}
    .highlight .val{font-family:"Cormorant Garamond",Georgia,serif;font-size:24px;font-weight:600;color:#c9a84c}
    .highlight .lbl{font-size:10px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.06em}
    /* ── FEATURES ── */
    .feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .feature-pill{background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px}
    /* ── INVESTMENT TABLE ── */
    .invest-table{width:100%;border-collapse:collapse}
    .invest-table th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;padding:10px 0;border-bottom:2px solid #0f172a;font-weight:700}
    .invest-table td{padding:14px 0;border-bottom:1px solid #f1f5f9;font-size:14px;vertical-align:top}
    .invest-table .cat-name{font-weight:600;color:#0f172a}
    .invest-table .cat-note{font-size:11px;color:#94a3b8;margin-top:2px}
    .invest-table .amt{text-align:right;font-family:"Cormorant Garamond",Georgia,serif;font-size:17px;font-weight:600;color:#0284c7;white-space:nowrap}
    /* ── TOTAL BANNER ── */
    .total-banner{background:linear-gradient(135deg,#0a0f1e,#1a2f5e);color:white;border-radius:16px;padding:36px 40px;display:flex;justify-content:space-between;align-items:center;margin-top:20px}
    .total-banner .left-side .label{font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#8a9ab5;margin-bottom:8px}
    .total-banner .amount{font-family:"Cormorant Garamond",Georgia,serif;font-size:46px;font-weight:300;color:white;letter-spacing:-1px}
    .total-banner .right-side{text-align:right}
    .total-banner .note{font-size:12px;color:#64748b;margin-top:8px}
    .total-banner .gold-badge{background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.3);border-radius:8px;padding:10px 18px;font-size:12px;color:#c9a84c;font-weight:700}
    /* ── VALIDITY ── */
    .validity{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;font-size:13px;color:#92400e;margin-top:16px;display:flex;gap:10px;align-items:flex-start}
    /* ── NEXT STEPS ── */
    .steps{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .step{display:flex;gap:14px;align-items:flex-start;background:#f8fafc;border-radius:10px;padding:16px;border:1px solid #f1f5f9}
    .step-num{min-width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#c9a84c,#a8873a);color:#0a0f1e;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0}
    .step-text{font-size:13px;color:#374151;line-height:1.5;padding-top:3px}
    .step-text strong{color:#0f172a;display:block;margin-bottom:3px}
    /* ── MATERIALS PAGE ── */
    .page-break{page-break-before:always}
    .materials-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px}
    .mat-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center}
    .mat-label{font-size:12px;color:#64748b;font-weight:500}
    .mat-val{font-family:"Cormorant Garamond",Georgia,serif;font-size:17px;font-weight:600;color:#0284c7}
    /* ── FOOTER ── */
    .footer{margin-top:48px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;line-height:1.8;display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
    @media print{
      .cover{padding:40px;min-height:auto}
      .body{padding:40px}
      .page-break{page-break-before:always}
    }
  </style></head><body>

  <!-- COVER PAGE -->
  <div class="cover">
    <div class="cover-logo">
      <div class="cover-logo-badge">
        <svg viewBox="0 0 52 42" width="34" height="27">
          <defs>
            <linearGradient id="pN" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6aaee8"/><stop offset="100%" stop-color="#1a2f5e"/></linearGradient>
            <linearGradient id="pG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e8c96a"/><stop offset="100%" stop-color="#a8873a"/></linearGradient>
            <linearGradient id="pD" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6aaee8"/><stop offset="100%" stop-color="#1a5fa8"/></linearGradient>
          </defs>
          <text x="0" y="34" font-family="Georgia,serif" font-weight="700" font-size="34" fill="url(#pN)">F</text>
          <path d="M 26 1 C 26 1,18 14,18 20 C 18 26 21.5 30 26 30 C 30.5 30 34 26 34 20 C 34 14 26 1 26 1 Z" fill="url(#pD)"/>
          <ellipse cx="23" cy="15" rx="2.5" ry="4" fill="white" opacity="0.4" transform="rotate(-15 23 15)"/>
          <text x="30" y="34" font-family="Georgia,serif" font-weight="700" font-size="34" fill="url(#pG)">P</text>
        </svg>
      </div>
      <div>
        <div class="cover-wordmark">POOL <span>CRAFT</span> PRO</div>
        <div class="cover-tagline">Design Pools. Craft Outdoor Living.</div>
      </div>
    </div>
    <h1>Your Pool Design<br>Proposal</h1>
    <div class="cover-for">Prepared exclusively for</div>
    <div class="cover-client">${escapeHtml(clientName) || "Valued Customer"}</div>
    <div class="cover-divider"></div>
    <div class="cover-meta">
      <span>📋 ${escapeHtml(projectName)}</span>
      <span>📅 ${date}</span>
      <span>📍 Valid through ${validUntil}</span>
    </div>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- Pool Highlights -->
    <div class="section">
      <div class="section-label">At a Glance</div>
      <div class="highlight-row">
        <div class="highlight"><div class="val">${len}' × ${wid}'</div><div class="lbl">Dimensions</div></div>
        <div class="highlight"><div class="val">${materials.gallons.toLocaleString()}</div><div class="lbl">Gallons</div></div>
        <div class="highlight"><div class="val">${activeEntries.length + activeHardscapes.length}</div><div class="lbl">Features</div></div>
        <div class="highlight"><div class="val">${shapeLabel}</div><div class="lbl">Shape</div></div>
      </div>
    </div>

    <!-- Pool Specifications -->
    <div class="section">
      <div class="section-label">Pool Specifications</div>
      <div class="spec-grid">
        <div class="spec"><label>Shape</label><span>${shapeLabel}</span></div>
        <div class="spec"><label>Dimensions</label><span>${len}' × ${wid}'</span></div>
        <div class="spec"><label>Depth Profile</label><span>${depthLabel}</span></div>
        <div class="spec"><label>Water Volume</label><span>${materials.gallons.toLocaleString()} gal</span></div>
        <div class="spec"><label>Interior Finish</label><span>${finishLabel}</span></div>
        <div class="spec"><label>Water Color</label><span>${colorLabel}</span></div>
      </div>
    </div>

    ${activeEntries.length > 0 ? `
    <!-- Pool Features -->
    <div class="section">
      <div class="section-label">Pool Features Included</div>
      <div class="feature-grid">
        ${activeEntries.map(e=>`<div class="feature-pill"><span>${e.icon}</span>${e.label}</div>`).join("")}
      </div>
    </div>` : ""}

    ${activeHardscapes.length > 0 ? `
    <!-- Outdoor Living -->
    <div class="section">
      <div class="section-label">Outdoor Living Features</div>
      <div class="feature-grid">
        ${activeHardscapes.map(h=>`<div class="feature-pill"><span>${h.icon}</span>${h.label}</div>`).join("")}
      </div>
    </div>` : ""}

    <!-- Investment -->
    <div class="section">
      <div class="section-label">Your Investment</div>
      <table class="invest-table">
        <thead><tr><th style="width:60%">Category</th><th class="amt">Estimated Range</th></tr></thead>
        <tbody>
          ${cats.map(cat => {
            const ci = items.filter(i=>i.cat===cat);
            const lo = ci.reduce((s,i)=>s+i.low,0), hi = ci.reduce((s,i)=>s+i.high,0);
            const notes = { "Pool Structure":"Excavation, gunite shell, coping, interior finish", "Entry & Features":"All selected water features and specialty entries", "Hardscapes":"Decking, outdoor living structures and surfaces", "Equipment":"Full Pentair equipment package", "Labor":"Labor, permits, engineering, and site prep" };
            return `<tr><td><div class="cat-name">${catLabels[cat]||cat}</div><div class="cat-note">${notes[cat]||""}</div></td><td class="amt">${fmt(lo)} – ${fmt(hi)}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
      <div class="total-banner">
        <div class="left-side">
          <div class="label">Total Project Investment</div>
          <div class="amount">${fmt(totalLow)} – ${fmt(totalHigh)}</div>
          <div class="note">Final pricing confirmed after site visit & contract</div>
        </div>
        <div class="right-side">
          <div class="gold-badge">💰 Midpoint: ${fmt(Math.round((totalLow+totalHigh)/2/1000)*1000)}</div>
        </div>
      </div>
      <div class="validity">
        <span>📅</span>
        <span>This proposal is valid through <strong>${validUntil}</strong>. Pricing reflects current regional material and labor costs. Subject to site verification and final contract.</span>
      </div>
    </div>

    <!-- Next Steps -->
    <div class="section">
      <div class="section-label">What Happens Next</div>
      <div class="steps">
        <div class="step"><div class="step-num">1</div><div class="step-text"><strong>Site Visit</strong>We schedule an in-person visit to confirm measurements, access, soil conditions, and any site-specific requirements.</div></div>
        <div class="step"><div class="step-num">2</div><div class="step-text"><strong>Final Contract</strong>We finalize your contract with locked pricing, material selections confirmed, and a projected construction start date.</div></div>
        <div class="step"><div class="step-num">3</div><div class="step-text"><strong>Permits Filed</strong>We submit your permit application to the local building department and coordinate with the utility locate service.</div></div>
        <div class="step"><div class="step-num">4</div><div class="step-text"><strong>Build Begins</strong>Construction starts — typically 6-10 weeks from groundbreaking to your first swim.</div></div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div style="max-width:480px">This proposal provides estimated pricing for budgeting and decision-making purposes based on typical regional construction costs. It is not a final contract or fixed-price quote. Final pricing is confirmed after an in-person site evaluation. Excludes engineering fees, utility relocation, HOA fees, and unforeseen site conditions. All work subject to local permit approval.</div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:14px;font-weight:600;color:#0f172a;letter-spacing:1px">POOL <span style="color:#c9a84c">CRAFT</span> PRO</div>
        <div>poolcraftpro.ai</div>
      </div>
    </div>
  </div>

  <!-- PAGE 2: MATERIALS REFERENCE -->
  <div class="page-break">
    <div class="body">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:36px">
        <div>
          <div style="font-size:10px;color:#c9a84c;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">Materials Reference</div>
          <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:300">Estimated Quantities</div>
        </div>
        <div style="font-size:12px;color:#94a3b8;text-align:right">${len}' × ${wid}' ${escapeHtml(shapeLabel)}<br>${escapeHtml(clientName||projectName)}</div>
      </div>
      <div class="materials-grid">
        <div class="mat-card"><span class="mat-label">Excavation</span><span class="mat-val">${materials.excavation}</span></div>
        <div class="mat-card"><span class="mat-label">Gunite / Shotcrete</span><span class="mat-val">${materials.gunite}</span></div>
        <div class="mat-card"><span class="mat-label">Rebar (#3 bar)</span><span class="mat-val">${materials.rebar}</span></div>
        <div class="mat-card"><span class="mat-label">PVC Plumbing</span><span class="mat-val">${materials.plumbing}</span></div>
        <div class="mat-card"><span class="mat-label">Coping</span><span class="mat-val">${materials.coping}</span></div>
        <div class="mat-card"><span class="mat-label">Interior Finish Area</span><span class="mat-val">${materials.finish}</span></div>
        <div class="mat-card"><span class="mat-label">Waterline Tile</span><span class="mat-val">${materials.tile}</span></div>
        <div class="mat-card"><span class="mat-label">Total Pool Volume</span><span class="mat-val">${materials.gallons.toLocaleString()} gal</span></div>
      </div>
      <div style="margin-top:24px;padding:14px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:12px;color:#64748b;line-height:1.7">
        <strong style="color:#0f172a;display:block;margin-bottom:4px">About These Estimates</strong>
        Rebar calculated at #3 bar on 12" grid spacing with 15% lap splice allowance, displayed in sticks (20 ft) and total linear feet. Excavation includes 15% over-dig for formwork. Gunite at 4" shell thickness. All quantities for reference — final takeoff by licensed contractor.
      </div>
      <div class="footer" style="margin-top:32px">
        <div>Materials estimates are for budgeting reference only. Actual quantities determined by licensed contractor after final engineering drawings. Prepared by Pool Craft Pro · poolcraftpro.ai</div>
        <div style="text-align:right;flex-shrink:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#94a3b8;letter-spacing:1px">POOL CRAFT PRO</div>
      </div>
    </div>
  </div>

  <script>window.onload=()=>setTimeout(()=>window.print(),800);</script>
  </body></html>`);
  win.document.close();
}

// ─── TEAM MANAGEMENT ────────────────────────────────────────────────────────
// Real multi-login Team access (not just a bigger cap on one account): the
// Team plan owner invites teammates by email; each teammate gets their own
// normal login, and useAuth's teamMembership check (in PoolCraftPro) is what
// actually grants them access once they sign in with a matching invite.
// Requires TEAM_SETUP_SQL to have been run in the user's own Supabase project
// - untested against a live database from this environment, so it fails soft
// (dbError banner + the SQL to paste in) rather than crashing if the tables
// don't exist yet.
async function ensureTeamRow(sb, ownerId, seats) {
  const { data: existing, error: selErr } = await sb.from("teams").select("id, seats").eq("owner_id", ownerId).maybeSingle();
  if (selErr) throw selErr;
  if (existing) {
    if (existing.seats !== seats) await sb.from("teams").update({ seats }).eq("id", existing.id);
    return existing;
  }
  const { data: created, error: createErr } = await sb.from("teams").insert({ owner_id: ownerId, seats }).select("id, seats").single();
  if (createErr) throw createErr;
  return created;
}

function TeamManagementPanel({ user, ownPlan, seats, teamMembership }) {
  const isOwner = ownPlan === "team";
  const [members, setMembers] = useState([]);
  const [teamId, setTeamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState(null);
  const [showSql, setShowSql] = useState(false);

  const loadTeam = useCallback(async () => {
    const sb = await loadSupabase();
    if (!sb) { setLoading(false); return; }
    try {
      const team = await ensureTeamRow(sb, user.id, seats);
      setTeamId(team.id);
      const { data: memberRows, error: memErr } = await sb.from("team_members").select("*").eq("team_id", team.id).order("invited_at");
      if (memErr) throw memErr;
      setMembers(memberRows || []);
      setDbError(false);
    } catch (e) {
      console.error("TeamManagementPanel: failed to load team", e);
      setDbError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id, seats]);

  useEffect(() => {
    (async () => {
      if (!isOwner || !user) { setLoading(false); return; }
      await loadTeam();
    })();
  }, [isOwner, user, loadTeam]);

  const invite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !teamId) return;
    if (members.length >= seats) { setInviteError(`You've reached your ${seats}-seat limit. Add more seats in the plan above.`); return; }
    setInviteError(null);
    const sb = await loadSupabase();
    const { error } = await sb.from("team_members").insert({ team_id: teamId, email, status: "pending" });
    if (error) { setInviteError(error.message.includes("duplicate") ? "Already invited." : error.message); return; }
    setInviteEmail("");
    loadTeam();
  };

  const removeMember = async (id) => {
    const sb = await loadSupabase();
    await sb.from("team_members").delete().eq("id", id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const copySql = () => { try { navigator.clipboard.writeText(TEAM_SETUP_SQL); } catch {} };

  if (!isOwner && teamMembership) {
    return (
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#22c55e",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>👥 Team Membership</div>
        <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>✅ You're an active member of a Team plan — you get {PLANS.team.dailyLimitPerSeat} renders/day under your own account.</div>
      </div>
    );
  }

  if (!isOwner) return null;

  const activeCount = members.filter((m) => m.status === "active").length;
  const pendingCount = members.filter((m) => m.status === "pending").length;

  return (
    <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
      <div style={{fontSize:12,fontWeight:700,color:"#22c55e",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>👥 Team Management</div>
      <div style={{fontSize:11,color:"#64748b",marginBottom:12}}>{seats}-seat plan · {activeCount} active{pendingCount>0?`, ${pendingCount} pending`:""}. Invited teammates sign up (or log in) normally with the email you invite — they don't need their own subscription.</div>

      {dbError && (
        <div style={{marginBottom:12}}>
          <div style={{padding:"10px 12px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:8,fontSize:12,color:"#f59e0b",marginBottom:8}}>⚠️ Team tables aren't set up in your Supabase project yet. Paste this into the same SQL editor you used for Cloud Sync, then reopen this tab.</div>
          <button onClick={()=>setShowSql(p=>!p)} style={{fontSize:11,color:"#22c55e",background:"none",border:"none",cursor:"pointer",padding:0,marginBottom:showSql?8:0}}>{showSql?"▲ Hide setup code":"▼ Show setup SQL code"}</button>
          {showSql && (
            <div>
              <pre style={{background:"#0a0e1a",border:"1px solid #1e293b",borderRadius:8,padding:10,fontSize:10,color:"#86efac",overflowX:"auto",whiteSpace:"pre-wrap",margin:0}}>{TEAM_SETUP_SQL}</pre>
              <button onClick={copySql} style={{marginTop:6,padding:"5px 10px",borderRadius:6,background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.25)",color:"#22c55e",fontSize:11,fontWeight:700,cursor:"pointer"}}>📋 Copy SQL</button>
            </div>
          )}
        </div>
      )}

      {!dbError && !loading && (
        <>
          {members.length > 0 && (
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
              {members.map((m) => (
                <div key={m.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 12px",background:"#1e293b",borderRadius:8}}>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.email}</div>
                    <div style={{fontSize:10,color:m.status==="active"?"#22c55e":"#f59e0b"}}>{m.status==="active"?"✅ Active":"⏳ Pending — waiting for them to log in"}</div>
                  </div>
                  <button onClick={()=>removeMember(m.id)} style={{padding:"6px 10px",borderRadius:6,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:6}}>
            <input type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&invite()} placeholder="teammate@email.com"
              style={{flex:1,background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"9px 10px",color:"#e2e8f0",fontSize:12,outline:"none"}}/>
            <button onClick={invite} disabled={!inviteEmail.trim()||members.length>=seats}
              style={{padding:"9px 14px",borderRadius:8,background:inviteEmail.trim()&&members.length<seats?"rgba(34,197,94,0.15)":"#1e293b",border:"1px solid rgba(34,197,94,0.3)",color:inviteEmail.trim()&&members.length<seats?"#22c55e":"#64748b",fontSize:12,fontWeight:700,cursor:inviteEmail.trim()&&members.length<seats?"pointer":"not-allowed",flexShrink:0}}>Invite</button>
          </div>
          {inviteError && <div style={{marginTop:6,fontSize:11,color:"#ef4444"}}>{inviteError}</div>}
        </>
      )}
    </div>
  );
}

// ─── SETTINGS SCREEN ─────────────────────────────────────────────────────────
// One place for all API keys, affiliate tags, and app preferences.
// Replaces the scattered key panels across tabs.
function SettingsScreen({ userMode, setUserMode, onSwitchMode, plan, ownPlan, seats, teamMembership, user, financingLinks, setFinancingLinks, reviewLinks, setReviewLinks }) {
  const [newFinancingName, setNewFinancingName] = useState("");
  const [newFinancingUrl, setNewFinancingUrl] = useState("");
  const addFinancingLink = () => {
    const name = newFinancingName.trim(), url = newFinancingUrl.trim();
    if (!name || !url) return;
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    setFinancingLinks(prev => [...prev, { name, url: withProtocol }]);
    setNewFinancingName(""); setNewFinancingUrl("");
  };
  const removeFinancingLink = (i) => setFinancingLinks(prev => prev.filter((_, idx) => idx !== i));
  const [billingInterval, setBillingInterval] = useState("month");
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState(null);
  const [teamSeats, setTeamSeats] = useState(PLANS.team.minSeats);

  const startCheckout = async (planId, seats) => {
    if (!user) return;
    setBillingLoading(true); setBillingError(null);
    try {
      const resp = await fetch("/api/create-checkout-session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, interval: billingInterval, userId: user.id, email: user.email, customerId: user.user_metadata?.stripe_customer_id, seats }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `Error ${resp.status}`);
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setBillingError(e.message || "Could not start checkout");
    } finally { setBillingLoading(false); }
  };

  const openBillingPortal = async () => {
    if (!user?.user_metadata?.stripe_customer_id) { setBillingError("No billing account found yet - try subscribing first."); return; }
    setBillingLoading(true); setBillingError(null);
    try {
      const resp = await fetch("/api/create-portal-session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: user.user_metadata.stripe_customer_id }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `Error ${resp.status}`);
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setBillingError(e.message || "Could not open billing portal");
    } finally { setBillingLoading(false); }
  };

  const [regridKey, setRegridKey] = useState(()=>{ try{return localStorage.getItem("pc_regrid_key")||"";}catch{return "";} });
  const [mapboxToken, setMapboxToken] = useState(()=>{ try{return localStorage.getItem("pc_mapbox_token")||"";}catch{return "";} });
  const supabaseCfg = getSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(supabaseCfg.url);
  const [sbKey, setSbKey] = useState(supabaseCfg.key?"●●●●●●●●":"");
  const [amazonTag, setAmazonTag] = useState(()=>{ try{return localStorage.getItem("pc_tag_amazon")||AFFILIATE_TAGS.amazon;}catch{return AFFILIATE_TAGS.amazon;} });
  const [hdTag, setHdTag] = useState(()=>{ try{return localStorage.getItem("pc_tag_hd")||AFFILIATE_TAGS.homedepot;}catch{return AFFILIATE_TAGS.homedepot;} });
  const [saved, setSaved] = useState(null);

  const save = (field, value, storageKey) => {
    try { localStorage.setItem(storageKey, value.trim()); } catch {}
    setSaved(field); setTimeout(()=>setSaved(null), 1800);
  };

  const KeyRow = ({ label, value, setValue, storageKey, placeholder, hint, isSet }) => (
    <div style={{background:"#0f172a",border:`1px solid ${isSet?"rgba(34,197,94,0.3)":"#1e293b"}`,borderRadius:12,padding:14,marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{label}</div>
        {isSet ? <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",fontWeight:700}}>✅ Active</span>
               : <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",color:"#f59e0b",fontWeight:700}}>⚠️ Not set</span>}
      </div>
      {hint&&<div style={{fontSize:11,color:"#64748b",marginBottom:8,lineHeight:1.5}}>{hint}</div>}
      <div style={{display:"flex",gap:8}}>
        <input type="password" value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}
          style={{flex:1,background:"#1e293b",border:`1px solid ${saved===label?"#22c55e":"#334155"}`,borderRadius:8,padding:"9px 12px",color:"#e2e8f0",fontSize:13,outline:"none"}}/>
        <button onClick={()=>save(label, value, storageKey)} disabled={!value.trim()||value==="●●●●●●●●"}
          style={{padding:"9px 16px",borderRadius:8,background:value.trim()&&value!=="●●●●●●●●"?"linear-gradient(135deg,#22c55e,#16a34a)":"#1e293b",border:"none",color:"white",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0}}>
          {saved===label?"✓ Saved!":"Save"}
        </button>
        {isSet&&<button onClick={()=>{ save(label,"",storageKey); setValue(""); }}
          style={{padding:"9px 12px",borderRadius:8,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0}}>✕</button>}
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"linear-gradient(135deg,rgba(6,182,212,0.12),rgba(2,132,199,0.06))",border:"1px solid rgba(6,182,212,0.25)",borderRadius:14,padding:14}}>
        <div style={{fontSize:14,fontWeight:800,color:"#06b6d4",marginBottom:4}}>🔧 App Settings</div>
        <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>All your API keys and affiliate tags live here. Keys are stored only on your device and never sent to anyone other than the service they're for.</div>
      </div>

      {/* User Mode */}
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#06b6d4",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>👤 Your Profile</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[{id:"contractor",icon:"👷",label:"Pool Contractor / Builder",desc:"Full technical detail, permits, client tools"},{id:"homeowner",icon:"🏠",label:"Homeowner / DIY",desc:"Simplified visual design, guided steps"},{id:"designer",icon:"🎨",label:"Landscape Designer",desc:"Visual design focus, hardscapes, renderings"}].map(m=>(
            <button key={m.id} onClick={()=>{ setUserMode(m.id); try{localStorage.setItem("pc_mode",m.id);}catch{} }}
              style={{textAlign:"left",padding:"12px 14px",borderRadius:10,border:`2px solid ${userMode===m.id?"#06b6d4":"#1e293b"}`,background:userMode===m.id?"rgba(6,182,212,0.08)":"#0f172a",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:22}}>{m.icon}</span>
              <div><div style={{fontSize:13,fontWeight:700,color:userMode===m.id?"#06b6d4":"#e2e8f0"}}>{m.label}</div><div style={{fontSize:11,color:"#64748b",marginTop:2}}>{m.desc}</div></div>
              {userMode===m.id&&<span style={{marginLeft:"auto",color:"#06b6d4",fontSize:16}}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* AI Rendering / Billing */}
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#a78bfa",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>🚀 FLUX — AI Pool Rendering</div>
        <div style={{fontSize:11,color:"#64748b",marginBottom:12}}>Every plan runs on a shared fal.ai key configured on the server — just choose a plan below.</div>

        {!user ? (
          <div style={{padding:"14px",borderRadius:10,background:"rgba(6,182,212,0.06)",border:"1px solid rgba(6,182,212,0.2)",fontSize:12,color:"#94a3b8"}}>
            Sign in to subscribe — plans are tied to your account so they follow you across devices.
          </div>
        ) : (
          <>
            {plan !== "none" && (
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"12px 14px",borderRadius:10,background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.25)",marginBottom:14}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:"#22c55e"}}>✅ {PLANS[plan]?.name} plan active{plan==="team"?` · ${seats} seats`:""}</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{plan==="team"?PLANS.team.dailyLimitPerSeat*seats:PLANS[plan]?.dailyLimit} renders / day</div>
                </div>
                <button onClick={openBillingPortal} disabled={billingLoading} style={{padding:"9px 14px",borderRadius:8,background:"rgba(6,182,212,0.12)",border:"1px solid rgba(6,182,212,0.3)",color:"#06b6d4",fontWeight:700,fontSize:12,cursor:billingLoading?"not-allowed":"pointer",flexShrink:0}}>
                  {billingLoading?"...":"Manage Billing"}
                </button>
              </div>
            )}

            <div style={{display:"flex",gap:6,marginBottom:12}}>
              {[{id:"month",label:"Monthly"},{id:"year",label:"Annual — save ~2 months"}].map(iv=>(
                <button key={iv.id} onClick={()=>setBillingInterval(iv.id)} style={{flex:1,padding:"8px 10px",borderRadius:8,border:`2px solid ${billingInterval===iv.id?"#a78bfa":"#1e293b"}`,background:billingInterval===iv.id?"rgba(124,58,237,0.1)":"#0f172a",color:billingInterval===iv.id?"#a78bfa":"#64748b",fontSize:11,fontWeight:700,cursor:"pointer"}}>{iv.label}</button>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              {[{id:"basic",renders:PLANS.basic.dailyLimit},{id:"pro",renders:PLANS.pro.dailyLimit}].map(p=>{
                const isCurrent = plan === p.id;
                const price = billingInterval === "year" ? PLANS[p.id].year : PLANS[p.id].month;
                return (
                  <div key={p.id} style={{padding:"14px",borderRadius:10,border:`2px solid ${isCurrent?"#22c55e":"#1e293b"}`,background:isCurrent?"rgba(34,197,94,0.06)":"#0f172a"}}>
                    <div style={{fontSize:13,fontWeight:800,color:isCurrent?"#22c55e":"#e2e8f0"}}>{PLANS[p.id].name}{isCurrent?" ✓":""}</div>
                    <div style={{fontSize:20,fontWeight:800,color:"#e2e8f0",marginTop:4}}>${price}<span style={{fontSize:11,color:"#64748b",fontWeight:400}}>/{billingInterval==="year"?"yr":"mo"}</span></div>
                    <div style={{fontSize:11,color:"#64748b",marginTop:2,marginBottom:10}}>{p.renders} renders / day</div>
                    <button onClick={()=>startCheckout(p.id, 1)} disabled={isCurrent||billingLoading}
                      style={{width:"100%",padding:"9px",borderRadius:8,background:isCurrent?"#1e293b":"linear-gradient(135deg,#7c3aed,#5b21b6)",border:"none",color:isCurrent?"#64748b":"white",fontWeight:700,fontSize:12,cursor:isCurrent||billingLoading?"not-allowed":"pointer"}}>
                      {isCurrent?"Current Plan":billingLoading?"...":"Subscribe"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Team - seat-based, for multi-person contractor shops. Billing only for
                now: this purchases a bigger daily render cap on the one account that
                subscribes, not separate logins for each teammate - there's no
                multi-user/team-account system in the app yet. */}
            <div style={{padding:"14px",borderRadius:10,border:`2px solid ${plan==="team"?"#22c55e":"#1e293b"}`,background:plan==="team"?"rgba(34,197,94,0.06)":"#0f172a"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:plan==="team"?"#22c55e":"#e2e8f0"}}>👥 {PLANS.team.name} — for contractor shops{plan==="team"?" ✓":""}</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:2}}>${billingInterval==="year"?PLANS.team.year:PLANS.team.month}/seat/{billingInterval==="year"?"yr":"mo"} · {PLANS.team.dailyLimitPerSeat} renders/day per seat</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:"#64748b"}}>Seats</span>
                  <input type="number" min={PLANS.team.minSeats} max={PLANS.team.maxSeats} value={teamSeats}
                    onChange={e=>setTeamSeats(Math.min(PLANS.team.maxSeats,Math.max(PLANS.team.minSeats,Number(e.target.value)||PLANS.team.minSeats)))}
                    style={{width:56,background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"6px 8px",color:"#e2e8f0",fontSize:13,outline:"none",textAlign:"center"}}/>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10,gap:10}}>
                <div style={{fontSize:16,fontWeight:800,color:"#e2e8f0"}}>
                  ${((billingInterval==="year"?PLANS.team.year:PLANS.team.month)*teamSeats).toLocaleString()}
                  <span style={{fontSize:11,color:"#64748b",fontWeight:400}}>/{billingInterval==="year"?"yr":"mo"} total ({teamSeats} × ${billingInterval==="year"?PLANS.team.year:PLANS.team.month})</span>
                </div>
                <button onClick={()=>startCheckout("team", teamSeats)} disabled={plan==="team"||billingLoading}
                  style={{padding:"9px 16px",borderRadius:8,background:plan==="team"?"#1e293b":"linear-gradient(135deg,#7c3aed,#5b21b6)",border:"none",color:plan==="team"?"#64748b":"white",fontWeight:700,fontSize:12,cursor:plan==="team"||billingLoading?"not-allowed":"pointer",flexShrink:0}}>
                  {plan==="team"?"Current Plan":billingLoading?"...":"Subscribe"}
                </button>
              </div>
            </div>

            {billingError && <div style={{marginTop:10,padding:"10px 12px",borderRadius:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontSize:12}}>⚠️ {billingError}</div>}
          </>
        )}
      </div>

      {(ownPlan==="team" || teamMembership) && <TeamManagementPanel user={user} ownPlan={ownPlan} seats={seats} teamMembership={teamMembership} />}

      {/* Maps & Parcel */}
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#06b6d4",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>🛰️ Site Plan Map</div>
        <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>The Site Plan tab's interactive map runs on your own free Mapbox account.</div>
        <KeyRow label="Mapbox Access Token" value={mapboxToken} setValue={setMapboxToken} storageKey="pc_mapbox_token" placeholder="Paste Mapbox public token (pk....)" isSet={!!mapboxToken}
          hint="Required to show the interactive Site Plan map. Free at mapbox.com — grab a public token from your account's Tokens page."/>
        <KeyRow label="Regrid API Key (Parcel Data)" value={regridKey} setValue={setRegridKey} storageKey="pc_regrid_key" placeholder="Paste Regrid key..." isSet={!!regridKey}
          hint="Optional — enables real parcel boundary geometry, lot size, zoning & setback data. Sign up at regrid.com. App works with an estimated rectangular parcel until this is set."/>
      </div>

      {/* Cloud Sync */}
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#22c55e",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>☁️ Cloud Sync (Supabase)</div>
        <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>Sync projects across all your devices. Free at supabase.com. Create a project, run the setup SQL, then paste your URL and anon key.</div>
        <CloudSyncPanel />
      </div>

      {/* Affiliate Tags */}
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>💰 Affiliate Tags — Your Revenue</div>
        <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>Replace the placeholders below with your real affiliate IDs. Every product link in the app includes your tag automatically.</div>
        <KeyRow label="Amazon Associates Tag" value={amazonTag} setValue={setAmazonTag} storageKey="pc_tag_amazon" placeholder="yourname-20" isSet={!amazonTag.includes("YOURTAG")} hint="Sign up at affiliate-program.amazon.com"/>
        <KeyRow label="Home Depot Affiliate Tag" value={hdTag} setValue={setHdTag} storageKey="pc_tag_hd" placeholder="Your HD tag" isSet={!hdTag.includes("YOUR_HD")} hint="Sign up at homedepot.com/affiliate"/>
      </div>

      {/* Financing Partners */}
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#22c55e",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>💳 Financing Partners</div>
        <div style={{fontSize:11,color:"#64748b",marginBottom:12}}>Paste your own financing company's application/referral link (Wisetack, Hearth, Synchrony, GreenSky, or any lender you already work with). These show up as "Estimate Your Financing" buttons for your clients in the Cost Estimator and Quote Builder.</div>

        {financingLinks.length > 0 && (
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
            {financingLinks.map((f,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 12px",background:"#1e293b",borderRadius:8}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{f.name}</div>
                  <div style={{fontSize:10,color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.url}</div>
                </div>
                <button onClick={()=>removeFinancingLink(i)} style={{padding:"6px 10px",borderRadius:6,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={{display:"flex",gap:6}}>
          <input type="text" value={newFinancingName} onChange={e=>setNewFinancingName(e.target.value)} placeholder="Name (e.g. Wisetack)"
            style={{flex:"0 0 150px",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"9px 10px",color:"#e2e8f0",fontSize:12,outline:"none"}}/>
          <input type="text" value={newFinancingUrl} onChange={e=>setNewFinancingUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addFinancingLink()} placeholder="Your referral link URL"
            style={{flex:1,background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"9px 10px",color:"#e2e8f0",fontSize:12,outline:"none"}}/>
          <button onClick={addFinancingLink} disabled={!newFinancingName.trim()||!newFinancingUrl.trim()}
            style={{padding:"9px 14px",borderRadius:8,background:newFinancingName.trim()&&newFinancingUrl.trim()?"rgba(34,197,94,0.15)":"#1e293b",border:"1px solid rgba(34,197,94,0.3)",color:newFinancingName.trim()&&newFinancingUrl.trim()?"#22c55e":"#64748b",fontSize:12,fontWeight:700,cursor:newFinancingName.trim()&&newFinancingUrl.trim()?"pointer":"not-allowed",flexShrink:0}}>Add</button>
        </div>
      </div>

      {/* Review / Referral Links */}
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#a78bfa",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>⭐ Review & Referral Links</div>
        <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>Shown to the client on the Build Tracker's final phase, right when satisfaction is highest. Saved automatically as you type.</div>
        {[
          { key:"google", label:"Google Business Review Link", placeholder:"https://g.page/r/.../review", hint:"Find yours in your Google Business Profile → Ask for reviews" },
          { key:"yelp", label:"Yelp Page Link", placeholder:"https://www.yelp.com/biz/...", hint:"Your business's Yelp page URL" },
          { key:"referral", label:"Referral Link", placeholder:"Your website's referral/promo page", hint:"Where a referred friend should land" },
        ].map(f=>(
          <div key={f.key} style={{background:"#0f172a",border:`1px solid ${reviewLinks[f.key]?"rgba(34,197,94,0.3)":"#1e293b"}`,borderRadius:12,padding:14,marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{f.label}</div>
              {reviewLinks[f.key] ? <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",fontWeight:700}}>✅ Set</span>
                                   : <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",color:"#f59e0b",fontWeight:700}}>⚠️ Not set</span>}
            </div>
            <div style={{fontSize:11,color:"#64748b",marginBottom:8,lineHeight:1.5}}>{f.hint}</div>
            <input type="text" value={reviewLinks[f.key]||""} onChange={e=>setReviewLinks(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}
              style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"9px 12px",color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
        ))}
      </div>

      {/* Version / About */}
      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:14,textAlign:"center"}}>
        <div style={{fontSize:13,fontWeight:800,color:"#e2e8f0",marginBottom:4,fontFamily:"Georgia,serif",letterSpacing:"2px"}}>
          <span style={{color:"#dde6f0"}}>POOL </span><span style={{color:"#c9a84c"}}>CRAFT </span><span style={{color:"#dde6f0"}}>PRO</span>
        </div>
        <div style={{fontSize:10,color:"#8a9ab5",letterSpacing:"2px",textTransform:"uppercase",marginBottom:8}}>Design Pools. Craft Outdoor Living.</div>
        <div style={{fontSize:11,color:"#64748b",lineHeight:1.7}}>Version 1.0 · poolcraftpro.ai · Built with React<br/>AI rendering by fal.ai FLUX · Maps by Mapbox<br/>Parcel data by Regrid · Cloud sync by Supabase</div>
      </div>
    </div>
  );
}

// ─── QUOTE BUILDER ────────────────────────────────────────────────────────────
// Contractor-facing tool: take the cost estimate, apply a markup, add custom
// line items, and produce a formal quote with a bottom-line number.
function QuoteBuilder({ shape, len, wid, depthId, finishId, entries, hardscapes, extras, localRates, projectName, clientName, plasterConfig, financingLinks=[] }) {
  const { items, totalLow, totalHigh } = computeCostItems({ shape, len, wid, depthId, finishId, entries, hardscapes, extras, localRates, plasterConfig });
  const [markup, setMarkup] = useState(15); // % contractor markup
  const [useHigh, setUseHigh] = useState(false); // use high or midpoint estimate as base
  const [customLines, setCustomLines] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [contingency, setContingency] = useState(10);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signedRecord, setSignedRecord] = useState(null); // { name, date } - basic acknowledgment capture, not a certified e-signature service
  const signQuote = () => { if (!signerName.trim() || !agreedToTerms) return; setSignedRecord({ name: signerName.trim(), date: new Date().toLocaleString() }); };
  const clearSignature = () => { setSignedRecord(null); setSignerName(""); setAgreedToTerms(false); };

  const base = useHigh ? totalHigh : Math.round((totalLow+totalHigh)/2);
  const markupAmt = Math.round(base * markup / 100);
  const customTotal = customLines.reduce((s,l)=>s+l.amount,0);
  const subtotal = base + markupAmt + customTotal;
  const contingencyAmt = Math.round(subtotal * contingency / 100);
  const grandTotal = subtotal + contingencyAmt;

  const addLine = () => {
    const amt = Number(newAmount.replace(/[^0-9.-]/g,""));
    if (!newLabel.trim() || !Number.isFinite(amt)) return;
    setCustomLines(p=>[...p, { id:Date.now(), label:newLabel.trim(), amount:amt }]);
    setNewLabel(""); setNewAmount("");
  };
  const removeLine = (id) => setCustomLines(p=>p.filter(l=>l.id!==id));

  const printQuote = () => {
    const win = window.open("","_blank"); if(!win) { alert("Please allow pop-ups for this site to export or print."); return; }
    const date = new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
    const validUntil = new Date(Date.now()+30*24*60*60*1000).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
    win.document.write(`<!DOCTYPE html><html><head><title>Quote - ${escapeHtml(clientName||projectName)}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;background:#fff;color:#1e293b;padding:40px}
    h1{font-size:22px;font-weight:800;margin-bottom:4px}h2{font-size:14px;font-weight:700;margin:20px 0 10px;text-transform:uppercase;letter-spacing:0.07em;color:#64748b}
    .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px}
    .total-row{display:flex;justify-content:space-between;padding:16px 20px;background:#0f172a;color:white;border-radius:12px;font-size:18px;font-weight:800;margin-top:16px}
    .footer{margin-top:30px;font-size:11px;color:#94a3b8;line-height:1.7;border-top:1px solid #e2e8f0;padding-top:16px}
    @media print{body{padding:20px}}</style></head><body>
    <h1>Construction Quote</h1>
    <div style="font-size:13px;color:#64748b;margin-bottom:20px">${clientName?`Prepared for: ${escapeHtml(clientName)} | `:""}${escapeHtml(projectName)} | ${date}</div>
    <h2>Scope</h2>
    <div class="row"><span>${len}' × ${wid}' ${escapeHtml(POOL_SHAPES.find(s=>s.id===shape)?.label||shape)}</span><span>${escapeHtml(POOL_FINISHES.find(f=>f.id===finishId)?.label||finishId)} finish</span></div>
    <h2>Cost Breakdown</h2>
    ${[...new Set(items.map(i=>i.cat))].map(cat=>{
      const ci=items.filter(i=>i.cat===cat), lo=ci.reduce((s,i)=>s+i.low,0), hi=ci.reduce((s,i)=>s+i.high,0);
      return `<div class="row"><span>${escapeHtml(cat)}</span><span style="font-weight:600">${fmt(useHigh?hi:Math.round((lo+hi)/2))}</span></div>`;
    }).join("")}
    ${customLines.map(l=>`<div class="row"><span>${escapeHtml(l.label)}</span><span style="font-weight:600">${fmt(l.amount)}</span></div>`).join("")}
    <div class="row" style="font-weight:700"><span>Contractor Margin (${markup}%)</span><span>${fmt(markupAmt)}</span></div>
    ${contingency>0?`<div class="row"><span>Contingency Reserve (${contingency}%)</span><span>${fmt(contingencyAmt)}</span></div>`:""}
    <div class="total-row"><span>Total Quote</span><span>${fmt(grandTotal)}</span></div>
    <div style="margin-top:12px;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e">
      ⏰ This quote is valid through <strong>${validUntil}</strong>. Pricing is subject to site verification.
    </div>
    ${signedRecord ? `<div style="margin-top:16px;padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:13px;color:#166534">✅ Signed by <strong>${escapeHtml(signedRecord.name)}</strong> on ${escapeHtml(signedRecord.date)}<br/><span style="font-size:11px;color:#4d7c5f">Typed-name acknowledgment, not a certified digital signature.</span></div>` : ""}
    <div class="footer">Quote prepared by Pool Craft Pro · poolcraftpro.ai. This quote is based on a visual design review and estimated material costs. Final pricing is confirmed after a physical site inspection. Excludes engineering fees, utility relocation, and unforeseen site conditions. All work subject to local permit approval.</div>
    <script>window.onload=()=>setTimeout(()=>window.print(),600);</script></body></html>`);
    win.document.close();
  };

  const cats = [...new Set(items.map(i=>i.cat))];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,119,6,0.06))",border:"1px solid rgba(245,158,11,0.3)",borderRadius:14,padding:14}}>
        <div style={{fontSize:14,fontWeight:800,color:"#f59e0b",marginBottom:4}}>📋 Quote Builder</div>
        <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>Apply your contractor margin, add custom line items, and generate a formal quote to send to the client. This is separate from the cost estimate — it's the number you stand behind.</div>
      </div>

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em"}}>Quote Base</div>
        <div style={{display:"flex",gap:8}}>
          {[{id:false,label:"Midpoint Estimate"},{id:true,label:"High Estimate"}].map(opt=>(
            <button key={String(opt.id)} onClick={()=>setUseHigh(opt.id)} style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${useHigh===opt.id?"#f59e0b":"#1e293b"}`,background:useHigh===opt.id?"rgba(245,158,11,0.1)":"#0f172a",color:useHigh===opt.id?"#f59e0b":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer"}}>{opt.label}</button>
          ))}
        </div>
        <div style={{textAlign:"center",padding:"12px",background:"#0f172a",borderRadius:10}}>
          <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>Base (before margin)</div>
          <div style={{fontSize:28,fontWeight:900,color:"#e2e8f0"}}>{fmt(base)}</div>
        </div>
      </div>

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:12,fontWeight:700,color:"#f59e0b"}}>Contractor Margin</span>
          <span style={{fontSize:14,fontWeight:800,color:"#f59e0b"}}>{markup}% = {fmt(markupAmt)}</span>
        </div>
        <input type="range" min={0} max={40} step={1} value={markup} onChange={e=>setMarkup(Number(e.target.value))} style={{width:"100%",accentColor:"#f59e0b"}}/>
        <div style={{fontSize:11,color:"#64748b",marginTop:4}}>Industry standard: 10-20% for residential pools</div>
      </div>

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:12,fontWeight:700,color:"#94a3b8"}}>Contingency Reserve</span>
          <span style={{fontSize:14,fontWeight:800,color:"#94a3b8"}}>{contingency}% = {fmt(contingencyAmt)}</span>
        </div>
        <input type="range" min={0} max={20} step={1} value={contingency} onChange={e=>setContingency(Number(e.target.value))} style={{width:"100%",accentColor:"#64748b"}}/>
        <div style={{fontSize:11,color:"#64748b",marginTop:4}}>Covers unexpected site conditions, material price changes</div>
      </div>

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#06b6d4",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>+ Custom Line Items</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
          {customLines.map(l=>(
            <div key={l.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#0f172a",borderRadius:8,border:"1px solid #1e293b"}}>
              <span style={{flex:1,fontSize:13,color:"#e2e8f0"}}>{l.label}</span>
              <span style={{fontSize:13,fontWeight:700,color:l.amount<0?"#ef4444":"#22c55e"}}>{l.amount<0?"-":""}{fmt(Math.abs(l.amount))}</span>
              <button onClick={()=>removeLine(l.id)} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:14,padding:"4px",minWidth:28,minHeight:28}}>✕</button>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Line item description" style={{flex:2,background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"9px 10px",color:"#e2e8f0",fontSize:12,outline:"none"}}/>
          <input value={newAmount} onChange={e=>setNewAmount(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addLine()} placeholder="$ amount" style={{flex:1,background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"9px 10px",color:"#e2e8f0",fontSize:12,outline:"none"}}/>
          <button onClick={addLine} style={{padding:"9px 14px",borderRadius:8,background:"rgba(6,182,212,0.15)",border:"1px solid rgba(6,182,212,0.3)",color:"#06b6d4",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0}}>+ Add</button>
        </div>
        <div style={{fontSize:11,color:"#64748b",marginTop:6}}>Use negative amounts for discounts</div>
      </div>

      <div style={{background:"linear-gradient(135deg,#0f2027,#1a3a4a)",border:"1px solid rgba(6,182,212,0.3)",borderRadius:16,padding:20,textAlign:"center"}}>
        <div style={{fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Total Quote</div>
        <div style={{fontSize:40,fontWeight:900,color:"#06b6d4",letterSpacing:"-1px"}}>{fmt(grandTotal)}</div>
        <div style={{fontSize:12,color:"#64748b",marginTop:6}}>{len}'×{wid}' {POOL_SHAPES.find(s=>s.id===shape)?.label} · {markup}% margin · {contingency}% contingency</div>
        <button onClick={()=>setShowBreakdown(p=>!p)} style={{marginTop:10,background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer"}}>{showBreakdown?"▲ Hide":"▼ Show"} full breakdown</button>
      </div>

      {showBreakdown && (
        <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:12,overflow:"hidden"}}>
          {cats.map(cat=>{
            const ci=items.filter(i=>i.cat===cat);
            const lo=ci.reduce((s,i)=>s+i.low,0), hi=ci.reduce((s,i)=>s+i.high,0);
            return <div key={cat} style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",borderBottom:"1px solid #0f172a"}}><span style={{fontSize:13,color:"#94a3b8"}}>{cat}</span><span style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{fmt(useHigh?hi:Math.round((lo+hi)/2))}</span></div>;
          })}
          {customLines.map(l=>(<div key={l.id} style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",borderBottom:"1px solid #0f172a"}}><span style={{fontSize:13,color:"#06b6d4"}}>{l.label}</span><span style={{fontSize:13,fontWeight:700,color:l.amount<0?"#ef4444":"#22c55e"}}>{fmt(l.amount)}</span></div>))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",borderBottom:"1px solid #0f172a"}}><span style={{fontSize:13,color:"#f59e0b"}}>Contractor Margin ({markup}%)</span><span style={{fontSize:13,fontWeight:700,color:"#f59e0b"}}>{fmt(markupAmt)}</span></div>
          {contingency>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",borderBottom:"1px solid #0f172a"}}><span style={{fontSize:13,color:"#64748b"}}>Contingency ({contingency}%)</span><span style={{fontSize:13,fontWeight:700,color:"#64748b"}}>{fmt(contingencyAmt)}</span></div>}
        </div>
      )}

      {financingLinks.length > 0 && (
        <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#22c55e",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>💳 Estimate Your Financing</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {financingLinks.map((f,i)=>(
              <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderRadius:10,background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.25)",textDecoration:"none"}}>
                <span style={{fontSize:13,fontWeight:700,color:"#22c55e"}}>{f.name}</span>
                <span style={{fontSize:16,color:"#22c55e"}}>→</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div style={{background:"#111827",border:`1px solid ${signedRecord?"rgba(34,197,94,0.4)":"#1e293b"}`,borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:signedRecord?"#22c55e":"#a78bfa",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>✍️ Client Sign-Off</div>
        {signedRecord ? (
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#22c55e"}}>✅ Signed by {signedRecord.name}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:2,marginBottom:10}}>{signedRecord.date}</div>
            <button onClick={clearSignature} style={{padding:"7px 14px",borderRadius:8,background:"rgba(100,116,139,0.1)",border:"1px solid #334155",color:"#94a3b8",fontSize:11,fontWeight:700,cursor:"pointer"}}>Clear signature</button>
          </div>
        ) : (
          <>
            <input type="text" value={signerName} onChange={e=>setSignerName(e.target.value)} placeholder="Type full legal name to sign"
              style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"9px 12px",color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:10}}/>
            <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,cursor:"pointer"}}>
              <input type="checkbox" checked={agreedToTerms} onChange={e=>setAgreedToTerms(e.target.checked)} style={{width:16,height:16}}/>
              <span style={{fontSize:12,color:"#94a3b8"}}>I have reviewed this quote and agree to its terms.</span>
            </label>
            <button onClick={signQuote} disabled={!signerName.trim()||!agreedToTerms}
              style={{width:"100%",padding:"10px",borderRadius:8,background:signerName.trim()&&agreedToTerms?"linear-gradient(135deg,#7c3aed,#5b21b6)":"#1e293b",border:"none",color:signerName.trim()&&agreedToTerms?"white":"#64748b",fontWeight:700,fontSize:12,cursor:signerName.trim()&&agreedToTerms?"pointer":"not-allowed"}}>
              Sign Quote
            </button>
          </>
        )}
        <div style={{fontSize:10,color:"#64748b",marginTop:10,lineHeight:1.5}}>Basic typed-name acknowledgment with a timestamp — not a certified e-signature service (DocuSign, HelloSign, etc). For agreements needing stronger legal enforceability, use a dedicated e-signature provider.</div>
      </div>

      <button onClick={printQuote} style={{width:"100%",padding:"16px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"white",fontWeight:800,fontSize:15,cursor:"pointer",boxShadow:"0 4px 20px rgba(245,158,11,0.3)"}}>
        📄 Print / Export Formal Quote {clientName?`for ${clientName}`:""}
      </button>
    </div>
  );
}

// ─── BUILD TIMELINE ───────────────────────────────────────────────────────────
function BuildTimeline({ shape, len, wid, depthId, entries, hardscapes }) {
  const hasInfinity = !!entries?.infinity_edge;
  const hasSpa = !!entries?.spa_attached;
  const hasGrotto = !!entries?.grotto;
  const hardscapeCount = Object.keys(hardscapes).filter(k=>hardscapes[k]!=null).length;
  const poolVolumeFt3 = len * wid * 4.25;
  const isLarge = poolVolumeFt3 > 3000;

  const phases = [
    { phase:"Week 1-2", icon:"📋", title:"Design, Permits & Planning", color:"#06b6d4",
      tasks:["Finalize pool design and sign contract","Submit permit application to local building dept","Engineering drawings completed (structural, electrical)","Utility locate (call 811 before any digging)","HOA approval if applicable"] },
    { phase:`Week 2-4${isLarge?" (extend 1 wk for large pools)":""}`, icon:"🚜", title:"Excavation & Steel", color:"#f59e0b",
      tasks:["Excavation: remove soil to pool depth + overdig","Steel rebar grid tied and inspected","Plumbing roughed in (main drains, returns, skimmers)","Steel/plumbing inspection — city inspector visits","Any retaining walls started now"] },
    { phase:"Week 4-5", icon:"💪", title:"Gunite / Shotcrete Shell", color:"#8b5cf6",
      tasks:["Gunite crew shoots concrete shell (4 inch thickness)","Shell cures 7-10 days (kept wet — critical step)","Grotto and infinity edge forms built during this phase",`Attached spa ${hasSpa?"shell poured simultaneously":""}`] },
    { phase:"Week 5-8", icon:"🔧", title:"Plumbing, Electrical & Equipment", color:"#22c55e",
      tasks:["Finish plumbing — all lines pressure tested","Equipment pad poured (pump, filter, heater location)","Electrical run — bonding, lighting conduit, panel work","Equipment installed: pump, filter, automation system","City electrical and plumbing inspection"] },
    { phase:`Week 6-9${hardscapeCount>3?" (longer with many hardscapes)":""}`, icon:"🏗️", title:"Deck & Hardscapes", color:"#d97706",
      tasks:["Concrete forms set for deck and coping","Coping installed (stone, tile, or concrete)","Deck poured and textured or pavers installed",hardscapeCount>0?"Hardscape features built (fire pit, pergola, kitchen, etc.)":"Optional hardscapes if included","Fencing installed around pool perimeter"] },
    { phase:"Week 9-10", icon:"✨", title:"Tile, Finish & Startup", color:"#ec4899",
      tasks:["Waterline tile installed","Interior finish applied (plaster, pebble, quartz, or tile)","Pool filled — takes 24-48 hrs typically","Startup chemistry balanced over 28-day cure","Equipment tested and programmed","Final city inspection and certificate of occupancy"] },
    { phase:"Week 10-11", icon:"🏊", title:"First Swim!", color:"#06b6d4",
      tasks:["Punch list walk-through with contractor","Homeowner orientation — equipment operation","Chemistry maintained at 2-week, 4-week intervals","Landscaping and site cleanup completed","Warranty documentation handed over"] },
  ];

  const totalWeeks = 10 + (isLarge?2:0) + (hardscapeCount>3?1:0) + (hasGrotto?1:0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"linear-gradient(135deg,rgba(6,182,212,0.1),rgba(2,132,199,0.05))",border:"1px solid rgba(6,182,212,0.25)",borderRadius:14,padding:14}}>
        <div style={{fontSize:14,fontWeight:800,color:"#06b6d4",marginBottom:4}}>📅 Build Timeline</div>
        <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>Estimated schedule based on your pool configuration. Timelines vary by contractor, permit speed, and weather.</div>
        <div style={{marginTop:10,display:"flex",gap:10,flexWrap:"wrap"}}>
          {[{label:"Total Build Time",val:`${totalWeeks}-${totalWeeks+2} weeks`},{label:"Pool Size",val:`${len}'×${wid}'`},{label:"Permit Time",val:"2-4 weeks"}].map(s=>(
            <div key={s.label} style={{background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:8,padding:"8px 12px"}}>
              <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.label}</div>
              <div style={{fontSize:14,fontWeight:800,color:"#06b6d4"}}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {phases.map((p,i)=>(
        <div key={i} style={{background:"#111827",border:`1px solid #1e293b`,borderRadius:14,overflow:"hidden"}}>
          <div style={{background:`linear-gradient(135deg,${p.color}22,${p.color}11)`,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,borderLeft:`4px solid ${p.color}`}}>
            <span style={{fontSize:22}}>{p.icon}</span>
            <div>
              <div style={{fontSize:10,color:p.color,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>{p.phase}</div>
              <div style={{fontSize:14,fontWeight:800,color:"#e2e8f0"}}>{p.title}</div>
            </div>
          </div>
          <div style={{padding:"10px 14px"}}>
            {p.tasks.filter(Boolean).map((task,j)=>(
              <div key={j} style={{display:"flex",gap:10,marginBottom:7,alignItems:"flex-start"}}>
                <span style={{color:p.color,fontSize:12,marginTop:1,flexShrink:0}}>→</span>
                <span style={{fontSize:13,color:"#94a3b8",lineHeight:1.5}}>{task}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:12,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",marginBottom:6}}>⚠️ Common Delays to Plan For</div>
        {["Permits can take 2-8 weeks depending on your county","Rain stops gunite and concrete pours — plan for weather","Equipment supply chain: order Pentair gear before excavation","HOA approval can add 2-4 weeks if required","Inspector availability varies by city — schedule early"].map((d,i)=>(
          <div key={i} style={{fontSize:12,color:"#94a3b8",marginBottom:5,display:"flex",gap:8}}><span style={{color:"#f59e0b",flexShrink:0}}>•</span>{d}</div>
        ))}
      </div>
    </div>
  );
}

// ─── QUICK RENDER — Live photo capture + instant AI render ───────────────────
// Competes directly with Vip3D YARD: contractor takes a photo in client's
// backyard during the sales visit, renders the pool right there on the spot.
function QuickRender({ len, wid, shape, finishId, colorId, entries, hardscapes, dailyRenders=0, dailyLimit=10, bumpDailyRender=()=>{} }) {
  const [photo, setPhoto] = useState(null);
  const [rendered, setRendered] = useState(null);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [style, setStyle] = useState("photorealistic");
  const [aiNote, setAiNote] = useState(null);
  const videoRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const streamRef = useRef(null);

  const finishLabel = POOL_FINISHES.find(f => f.id === finishId)?.label || finishId;
  const colorLabel = POOL_COLORS.find(c => c.id === colorId)?.label || colorId;
  const shapeLabel = POOL_SHAPES.find(s => s.id === shape)?.label || shape;
  const activeFeatures = ENTRY_FEATURES.filter(e => entries[e.id]);
  const activeHardscapes = HARDSCAPE_OPTIONS.filter(h => hardscapes[h.id] != null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true); setError(null);
    } catch (e) {
      setError("Camera access denied. Please allow camera access in your browser settings, or upload a photo instead.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPhoto(dataUrl); stopCamera(); setRendered(null); setError(null);
  };

  const uploadPhoto = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file (JPG, PNG, etc)."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Photo too large — keep under 8MB"); return; }
    const reader = new FileReader();
    reader.onload = ev => { setPhoto(ev.target.result); setRendered(null); setError(null); };
    reader.readAsDataURL(file);
  };

  const renderNow = async () => {
    if (!photo) { setError("Take or upload a photo of the backyard first."); return; }
    if (dailyLimit <= 0) { setError("AI rendering needs an active Basic or Pro plan - subscribe in Settings to unlock it."); return; }
    if (dailyRenders >= dailyLimit) { setError(`You've used all ${dailyLimit} renders for today - pool and hardscape renders share this limit.`); return; }
    setRendering(true); setError(null); setProgress(5); setRendered(null); setAiNote(null);
    const steps = [[10,"Sending to FLUX..."],[25,"Analyzing the space..."],[42,"Placing your pool..."],[58,"Rendering water & light..."],[74,"Matching shadows..."],[88,"Final polish..."]];
    let si = 0;
    const iv = setInterval(() => { if (si < steps.length) { setProgress(steps[si][0]); si++; } }, 3500);
    try {
      const featureList = activeFeatures.map(f => f.label).join(", ");
      const hardList = activeHardscapes.map(h => h.label).join(", ");
      const styleMap = {
        photorealistic: "natural daylight, ultra-photorealistic, correct perspective and shadows",
        twilight: "golden dusk lighting, warm sunset atmosphere, cinematic",
        night: "evening with LED pool lighting, dramatic night photography",
        magazine: "luxury architecture magazine, editorial lighting, aspirational",
      };
      let prompt = `Edit this backyard photo to add a realistic ${shapeLabel}-shaped swimming pool, ${len} feet by ${wid} feet wide, with ${colorLabel} water and ${finishLabel} interior finish.`;
      if (featureList) prompt += ` Include: ${featureList}.`;
      if (hardList) prompt += ` Also add: ${hardList}.`;
      prompt += ` The pool must look completely natural and permanently built here — correct perspective, realistic shadows, proper depth, real water reflections. ${styleMap[style]}. Ultra HD photorealistic result.`;

      const b64 = photo.split(",")[1];
      const mediaType = photo.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      const resp = await fetch(`${RENDER_SERVICE_URL}/api/generate-pool-render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, image: { b64_json: b64, media_type: mediaType } }),
      });
      clearInterval(iv);
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        if (resp.status === 429) throw new Error("Rate limit — wait 60 seconds");
        throw new Error(e?.error || `Error ${resp.status}`);
      }
      const data = await resp.json();
      const b64r = data?.b64_json;
      if (!b64r) throw new Error("No image returned — please try again");
      setProgress(100); setRendered(`data:image/jpeg;base64,${b64r}`);
      bumpDailyRender();
      // Get AI designer note
      fetch("/api/describe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `In 2 enthusiastic sentences, describe this pool design to an excited homeowner: ${len}x${wid} ${shapeLabel} pool, ${colorLabel} water, ${finishLabel} finish${featureList ? ", " + featureList : ""}.` })
      }).then(r => r.json()).then(d => setAiNote(d?.text || null)).catch(() => {});
    } catch (e) { clearInterval(iv); setError(e.message); }
    finally { setRendering(false); }
  };

  const STYLES = [
    { id: "photorealistic", label: "📷 Daylight" },
    { id: "twilight", label: "🌅 Twilight" },
    { id: "night", label: "🌙 Night" },
    { id: "magazine", label: "✨ Magazine" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,rgba(201,168,76,0.15),rgba(168,135,58,0.08))", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#c9a84c", marginBottom: 6 }}>⚡ Quick Render — Close the Deal On-Site</div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
          Stand in the client's backyard → tap the camera → show them their pool rendered into their real yard in under 60 seconds. No laptop needed. No site visit to schedule later. Close the deal right now.
        </div>
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[`${len}'×${wid}' ${shapeLabel}`, colorLabel, finishLabel, ...activeFeatures.slice(0, 2).map(f => f.label)].map(tag => (
            <span key={tag} style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)", color: "#c9a84c", fontSize: 11, fontWeight: 600 }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* Camera / Photo */}
      {!photo ? (
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" }}>
          {cameraActive ? (
            <div>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", display: "block", maxHeight: 320, objectFit: "cover", background: "#000" }} />
              <div style={{ padding: 12, display: "flex", gap: 8 }}>
                <button onClick={capturePhoto} style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#c9a84c,#a8873a)", color: "#0a0f1e", fontWeight: 900, fontSize: 16, cursor: "pointer" }}>📸 Capture</button>
                <button onClick={stopCamera} style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 1.6 }}>Step 1 — Get a photo of the client's backyard</div>
              <button onClick={startCamera} style={{ padding: 16, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#c9a84c,#a8873a)", color: "#0a0f1e", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>📷 Open Camera — Take Live Photo</button>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: "#1e293b" }} />
                <span style={{ fontSize: 11, color: "#64748b" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "#1e293b" }} />
              </div>
              <label style={{ padding: 14, borderRadius: 12, border: "1px solid #334155", background: "#0f172a", color: "#94a3b8", fontWeight: 700, fontSize: 13, cursor: "pointer", textAlign: "center", display: "block" }}>
                📁 Upload Existing Photo
                <input type="file" accept="image/*" onChange={uploadPhoto} style={{ display: "none" }} />
              </label>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ position: "relative" }}>
            <img src={photo} alt="Backyard" style={{ width: "100%", display: "block", maxHeight: 260, objectFit: "cover" }} />
            <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(201,168,76,0.9)", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#0a0f1e" }}>✅ Photo Ready</div>
            <button onClick={() => { setPhoto(null); setRendered(null); setError(null); }} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", color: "white", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✕ Retake</button>
          </div>
        </div>
      )}

      {/* Style selector */}
      <div style={{ display: "flex", gap: 6 }}>
        {STYLES.map(s => (
          <button key={s.id} onClick={() => setStyle(s.id)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: `2px solid ${style === s.id ? "#c9a84c" : "#334155"}`, background: style === s.id ? "rgba(201,168,76,0.1)" : "#111827", color: style === s.id ? "#c9a84c" : "#64748b", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{s.label}</button>
        ))}
      </div>

      {/* Render button */}
      {!rendering && !rendered && (
        <>
          <button onClick={renderNow} disabled={!photo || dailyRenders>=dailyLimit} style={{ width: "100%", padding: 18, borderRadius: 14, border: "none", background: (photo && dailyRenders<dailyLimit) ? "linear-gradient(135deg,#7c3aed,#5b21b6)" : "#1e293b", color: "white", fontWeight: 900, fontSize: 17, cursor: (photo && dailyRenders<dailyLimit) ? "pointer" : "not-allowed", boxShadow: (photo && dailyRenders<dailyLimit) ? "0 4px 30px rgba(124,58,237,0.4)" : "none", letterSpacing: "0.02em" }}>
            {dailyLimit<=0 ? "🔒 Subscribe to Start Rendering" : dailyRenders>=dailyLimit ? `⚠️ All ${dailyLimit} renders used today` : "🚀 Render Pool Into This Backyard"}
          </button>
          <div style={{ fontSize: 10, color: "#64748b", textAlign: "center" }}>
            {dailyLimit<=0 ? "AI rendering needs an active Basic or Pro plan - subscribe in Settings" : `${dailyRenders} of ${dailyLimit} renders used today - pool and hardscape renders share this limit`}
          </div>
        </>
      )}

      {/* Progress */}
      {rendering && (
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 14, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa", marginBottom: 10 }}>FLUX is rendering your pool...</div>
          <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#7c3aed,#a78bfa,#c9a84c)", borderRadius: 3, transition: "width 3s ease" }} />
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>About 30-45 seconds — worth every one</div>
        </div>
      )}

      {/* Error */}
      {error && !rendering && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, color: "#ef4444", fontWeight: 600, marginBottom: 8 }}>⚠️ {error}</div>
          <button onClick={renderNow} style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Try Again</button>
        </div>
      )}

      {/* Result */}
      {rendered && !rendering && (
        <div style={{ background: "#111827", border: "2px solid rgba(201,168,76,0.4)", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 40px rgba(201,168,76,0.15)" }}>
          <div style={{ position: "relative" }}>
            <img src={rendered} alt="Pool rendering" style={{ width: "100%", display: "block" }} />
            <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(201,168,76,0.95)", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 800, color: "#0a0f1e" }}>⚡ QUICK RENDER — Pool Craft Pro</div>
          </div>
          {aiNote && (
            <div style={{ padding: "14px 16px", background: "rgba(201,168,76,0.06)", borderTop: "1px solid rgba(201,168,76,0.15)" }}>
              <div style={{ fontSize: 10, color: "#c9a84c", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>🤖 AI Designer Note</div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.65, fontStyle: "italic" }}>{aiNote}</div>
            </div>
          )}
          <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <button onClick={() => { setRendered(null); setProgress(0); setTimeout(renderNow, 80); }} style={{ padding: 11, borderRadius: 10, border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.1)", color: "#a78bfa", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🔄 New</button>
            <a href={rendered} download="poolcraft-quick-render.jpg" style={{ padding: 11, borderRadius: 10, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 700, fontSize: 12, textDecoration: "none", textAlign: "center", display: "block" }}>⬇️ Save</a>
            <button onClick={() => { if (navigator.share) navigator.share({ title: "Pool Design", text: "Your pool design from Pool Craft Pro", files: [] }); }} style={{ padding: 11, borderRadius: 10, border: "1px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.1)", color: "#c9a84c", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>📤 Share</button>
          </div>
        </div>
      )}

      {rendered && !rendering && (
        <MaskTweakPanel imageUrl={rendered} onTweaked={setRendered} dailyRenders={dailyRenders} dailyLimit={dailyLimit} bumpDailyRender={bumpDailyRender} />
      )}
    </div>
  );
}

// ─── BUILD TRACKER — Post-sale phase tracking with client portal ──────────────
const BUILD_PHASES = [
  { id: "contract",    label: "Contract & Deposit",         icon: "📝", days: "Day 1",       detail: "Contract signed, deposit received, project activated" },
  { id: "design",      label: "Final Design Approval",      icon: "✅", days: "Days 1-7",    detail: "Client approves final pool design and selections" },
  { id: "permits",     label: "Permit Application",         icon: "🏛️", days: "Days 3-21",   detail: "Building permit submitted to local municipality" },
  { id: "permits_app", label: "Permits Approved",           icon: "✅", days: "Days 14-42",  detail: "All permits approved, ready to schedule excavation" },
  { id: "locate",      label: "Utility Locate (811)",       icon: "📍", days: "3 days before dig", detail: "All underground utilities marked before excavation" },
  { id: "excavation",  label: "Excavation",                 icon: "🚜", days: "1-2 days",    detail: "Pool excavated to engineered depth and dimensions" },
  { id: "steel",       label: "Steel & Plumbing Rough-In",  icon: "🔩", days: "2-3 days",    detail: "Rebar grid tied, main drain and plumbing roughed in" },
  { id: "inspection1", label: "Steel/Plumbing Inspection",  icon: "🔍", days: "1 day",       detail: "City inspector approves steel and plumbing" },
  { id: "gunite",      label: "Gunite / Shotcrete",         icon: "💪", days: "1-2 days",    detail: "Concrete shell shot and formed. Curing begins." },
  { id: "cure",        label: "Shell Curing",               icon: "⏰", days: "7-10 days",   detail: "Shell kept wet daily for proper curing — do not disturb" },
  { id: "equipment",   label: "Equipment Installation",     icon: "⚙️", days: "1-2 days",    detail: "Pump, filter, heater, automation installed on pad" },
  { id: "electrical",  label: "Electrical Rough-In",        icon: "⚡", days: "1-2 days",    detail: "All electrical run, bonding complete, lighting conduit" },
  { id: "inspection2", label: "Electrical Inspection",      icon: "🔍", days: "1 day",       detail: "City inspector approves electrical and bonding" },
  { id: "deck",        label: "Coping & Deck",              icon: "🏗️", days: "3-5 days",    detail: "Coping installed, deck formed and poured or paved" },
  { id: "tile",        label: "Waterline Tile",             icon: "🔷", days: "1-2 days",    detail: "Waterline tile installed and grouted" },
  { id: "plaster",     label: "Interior Finish",            icon: "✨", days: "1 day",       detail: "Pool interior plastered, pebbled, or tiled" },
  { id: "fill",        label: "Pool Fill",                  icon: "💧", days: "24-48 hrs",   detail: "Pool filled with water — do not stop mid-fill" },
  { id: "startup",     label: "Equipment Startup",          icon: "🔌", days: "1 day",       detail: "All equipment tested, chemistry balanced, startup complete" },
  { id: "final_insp",  label: "Final Inspection",           icon: "🏆", days: "1 day",       detail: "City final inspection and certificate of occupancy" },
  { id: "complete",    label: "Project Complete",           icon: "🎉", days: "",            detail: "Homeowner orientation complete. Enjoy your pool!" },
];

function BuildTracker({ projectName, clientName, clientEmail, clientPhone, reviewLinks={} }) {
  const storageKey = `pc_build_${encodeURIComponent(projectName || "default").slice(0, 40)}`;
  const [phases, setPhases] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { return {}; }
  });
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey + "_notes") || "{}"); } catch { return {}; }
  });
  const [editingNote, setEditingNote] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [showClientView, setShowClientView] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(() => { try { return localStorage.getItem(storageKey + "_sms") === "1"; } catch { return false; } });
  const [smsStatus, setSmsStatus] = useState(null);

  const toggleSms = () => {
    const next = !smsEnabled;
    setSmsEnabled(next);
    try { localStorage.setItem(storageKey + "_sms", next ? "1" : "0"); } catch {}
  };

  // Requires a real Twilio account (TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER
  // in Vercel) - api/send-sms.js returns a clear 503 until then, surfaced
  // here rather than failing silently. Never blocks marking a phase done.
  const sendPhaseText = async (phaseLabel) => {
    if (!smsEnabled || !clientPhone) return;
    try {
      const resp = await fetch("/api/send-sms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: clientPhone, body: `Update on your pool at ${projectName}: "${phaseLabel}" is complete! - Pool Craft Pro` }),
      });
      const data = await resp.json();
      setSmsStatus(resp.ok ? { ok: true, msg: `Texted ${clientName || "client"} at ${clientPhone}` } : { ok: false, msg: data?.error || "Text failed to send" });
    } catch {
      setSmsStatus({ ok: false, msg: "Could not reach the SMS service" });
    }
    setTimeout(() => setSmsStatus(null), 6000);
  };

  const togglePhase = (id) => {
    const wasComplete = !!phases[id];
    const updated = { ...phases, [id]: phases[id] ? null : { completedAt: new Date().toISOString(), by: "contractor" } };
    setPhases(updated);
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
    if (!wasComplete) {
      const phase = BUILD_PHASES.find((p) => p.id === id);
      if (phase) sendPhaseText(phase.label);
    }
  };

  const saveNote = (id) => {
    const updated = { ...notes, [id]: noteInput.trim() };
    setNotes(updated); setEditingNote(null); setNoteInput("");
    try { localStorage.setItem(storageKey + "_notes", JSON.stringify(updated)); } catch {}
  };

  const completed = BUILD_PHASES.filter(p => phases[p.id]).length;
  const pct = Math.round((completed / BUILD_PHASES.length) * 100);
  const nextPhase = BUILD_PHASES.find(p => !phases[p.id]);
  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

  // Client-facing view
  if (showClientView) return (
    <div style={{ background: "#0a0f1e", minHeight: "100%", padding: 16, fontFamily: "Inter,system-ui,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setShowClientView(false)} style={{ background: "none", border: "none", color: "#64748b", fontSize: 20, cursor: "pointer" }}>←</button>
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 900, fontSize: 14, letterSpacing: "1px" }}>
            <span style={{ color: "#e2e8f0" }}>POOL </span><span style={{ color: "#c9a84c" }}>CRAFT </span><span style={{ color: "#e2e8f0" }}>PRO</span>
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>Client Progress View — {clientName || projectName}</div>
        </div>
      </div>
      <div style={{ background: "linear-gradient(135deg,#0f1e3d,#1a2f5e)", borderRadius: 16, padding: 20, marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: "#c9a84c", marginBottom: 4 }}>{pct}%</div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 14 }}>Your pool is {pct}% complete</div>
        <div style={{ height: 8, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#c9a84c,#e8c96a)", borderRadius: 4, transition: "width 0.5s" }} />
        </div>
        {nextPhase && <div style={{ marginTop: 14, fontSize: 12, color: "#94a3b8" }}>Next: <strong style={{ color: "#c9a84c" }}>{nextPhase.label}</strong></div>}
      </div>
      {BUILD_PHASES.map(p => {
        const done = !!phases[p.id];
        const isCurrent = !done && p.id === nextPhase?.id;
        return (
          <div key={p.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12, opacity: done || isCurrent ? 1 : 0.4 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: done ? "linear-gradient(135deg,#c9a84c,#a8873a)" : isCurrent ? "rgba(201,168,76,0.2)" : "#1e293b", border: isCurrent ? "2px solid #c9a84c" : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{done ? "✓" : p.icon}</div>
            <div style={{ flex: 1, paddingTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: done ? 700 : 600, color: done ? "#c9a84c" : isCurrent ? "#e2e8f0" : "#64748b" }}>{p.label}</div>
              {done && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Completed {formatDate(phases[p.id]?.completedAt)}</div>}
              {isCurrent && <div style={{ fontSize: 11, color: "#c9a84c", marginTop: 2 }}>⚡ In Progress</div>}
              {notes[p.id] && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, lineHeight: 1.5 }}>📝 {notes[p.id]}</div>}
            </div>
          </div>
        );
      })}

      {pct === 100 && (reviewLinks.google || reviewLinks.yelp || reviewLinks.referral) && (
        <div style={{ marginTop: 8, background: "linear-gradient(135deg,rgba(201,168,76,0.15),rgba(168,135,58,0.08))", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 16, padding: 18, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#c9a84c", marginBottom: 6 }}>Your pool is complete!</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14, lineHeight: 1.6 }}>If you loved working with us, a quick review means the world — and helps other families find us too.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reviewLinks.google && <a href={reviewLinks.google} target="_blank" rel="noopener noreferrer" style={{ padding: "12px", borderRadius: 10, background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.35)", color: "#c9a84c", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>⭐ Leave a Google Review</a>}
            {reviewLinks.yelp && <a href={reviewLinks.yelp} target="_blank" rel="noopener noreferrer" style={{ padding: "12px", borderRadius: 10, background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.35)", color: "#c9a84c", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>⭐ Leave a Yelp Review</a>}
            {reviewLinks.referral && <a href={reviewLinks.referral} target="_blank" rel="noopener noreferrer" style={{ padding: "12px", borderRadius: 10, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", color: "#94a3b8", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>👋 Know someone who wants a pool? Refer them here</a>}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,rgba(74,122,181,0.15),rgba(26,47,94,0.1))", border: "1px solid rgba(74,122,181,0.3)", borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#7ab0e8", marginBottom: 4 }}>🏗️ Build Tracker — {projectName}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12, lineHeight: 1.6 }}>Track every construction phase and share real-time progress with your client. Reduces client anxiety, reduces calls, closes more referrals.</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{completed} of {BUILD_PHASES.length} phases complete</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#c9a84c" }}>{pct}%</span>
            </div>
            <div style={{ height: 8, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#c9a84c,#e8c96a)", borderRadius: 4, transition: "width 0.4s" }} />
            </div>
          </div>
          <button onClick={() => setShowClientView(true)} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(201,168,76,0.35)", background: "rgba(201,168,76,0.1)", color: "#c9a84c", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>👤 Client View</button>
        </div>
        {clientEmail && <div style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>💡 Share the Client View link with {clientName || clientEmail} so they can check progress anytime</div>}
        {pct === 100 && (
          (reviewLinks.google || reviewLinks.yelp || reviewLinks.referral)
            ? <div style={{ marginTop: 10, fontSize: 11, color: "#22c55e" }}>🎉 Project complete — the Client View now shows your review & referral links.</div>
            : <div style={{ marginTop: 10, fontSize: 11, color: "#f59e0b" }}>🎉 Project complete — add your Google/Yelp/referral links in Settings to prompt the client for a review right here.</div>
        )}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(74,122,181,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>📱 Text client on each phase update</div>
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{clientPhone ? `Sends to ${clientPhone}` : "Add a client phone number to enable this"}</div>
          </div>
          <button onClick={toggleSms} disabled={!clientPhone} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: clientPhone ? "pointer" : "not-allowed", background: smsEnabled && clientPhone ? "#06b6d4" : "#334155", position: "relative", transition: "background 0.2s", flexShrink: 0, opacity: clientPhone ? 1 : 0.5 }}>
            <span style={{ position: "absolute", top: 3, left: smsEnabled && clientPhone ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
          </button>
        </div>
        {smsStatus && <div style={{ marginTop: 8, fontSize: 11, color: smsStatus.ok ? "#22c55e" : "#ef4444" }}>{smsStatus.ok ? "✅" : "⚠️"} {smsStatus.msg}</div>}
      </div>

      {/* Phase list */}
      {BUILD_PHASES.map((p, i) => {
        const done = !!phases[p.id];
        const isNext = !done && BUILD_PHASES.slice(0, i).every(prev => phases[prev.id]);
        return (
          <div key={p.id} style={{ background: "#111827", border: `1px solid ${done ? "rgba(201,168,76,0.3)" : isNext ? "rgba(74,122,181,0.3)" : "#1e293b"}`, borderRadius: 12, padding: 14, opacity: done || isNext ? 1 : 0.65 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <button onClick={() => togglePhase(p.id)} style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${done ? "#c9a84c" : isNext ? "#7ab0e8" : "#334155"}`, background: done ? "rgba(201,168,76,0.15)" : "#1e293b", color: done ? "#c9a84c" : "#64748b", fontSize: 14, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {done ? "✓" : p.icon}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: done ? "#c9a84c" : isNext ? "#7ab0e8" : "#94a3b8" }}>{p.label}</div>
                  <div style={{ fontSize: 10, color: "#64748b", flexShrink: 0 }}>{p.days}</div>
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 3, lineHeight: 1.5 }}>{p.detail}</div>
                {done && <div style={{ fontSize: 10, color: "#a8873a", marginTop: 4 }}>✓ Completed {formatDate(phases[p.id]?.completedAt)}</div>}
                {notes[p.id] && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, padding: "6px 10px", background: "#0f172a", borderRadius: 8 }}>📝 {notes[p.id]}</div>}
                {editingNote === p.id ? (
                  <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                    <input autoFocus value={noteInput} onChange={e => setNoteInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveNote(p.id)} placeholder="Add a note for this phase..." style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "7px 10px", color: "#e2e8f0", fontSize: 12, outline: "none" }} />
                    <button onClick={() => saveNote(p.id)} style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Save</button>
                    <button onClick={() => { setEditingNote(null); setNoteInput(""); }} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#64748b", fontSize: 11, cursor: "pointer" }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingNote(p.id); setNoteInput(notes[p.id] || ""); }} style={{ marginTop: 6, fontSize: 10, color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: 0 }}>{notes[p.id] ? "✏️ Edit note" : "+ Add note"}</button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
// ─── AUTH SYSTEM ─────────────────────────────────────────────────────────────
// Your Supabase credentials — customers never see these
// They are loaded from environment variables on Vercel
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Auth state hook
function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { setAuthLoading(false); return; }
    loadSupabase().then(sb => {
      if (!sb) { setAuthLoading(false); return; }
      sb.auth.getSession().then(({ data: { session: s } }) => {
        setSession(s); setUser(s?.user || null); setAuthLoading(false);
      });
      const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => {
        setSession(s); setUser(s?.user || null);
      });
      return () => subscription?.unsubscribe();
    });
  }, []);

  const signOut = async () => {
    const sb = await loadSupabase();
    if (sb) await sb.auth.signOut();
    setUser(null); setSession(null);
  };

  // Plan changes happen server-side via the Stripe webhook (it writes
  // user_metadata.plan using the Supabase service role, bypassing this
  // client entirely) - the client never sets its own plan. After returning
  // from Stripe Checkout, call this to pull the freshly-updated metadata
  // into the current session instead of waiting for the next natural
  // auth-state event.
  const refreshUser = async () => {
    const sb = await loadSupabase();
    if (!sb) return null;
    const { data, error } = await sb.auth.getUser();
    if (!error && data?.user) setUser(data.user);
    return data?.user || null;
  };

  return { user, session, authLoading, signOut, refreshUser };
}

// Login / Signup Screen
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // If Supabase not configured, skip auth and go straight to app
  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { onAuth({ id: "guest", email: "guest", guest: true }); }
  }, []);

  const handleSubmit = async () => {
    setError(null); setSuccess(null);
    if (!email.trim()) { setError("Email is required"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const sb = await loadSupabase();
      if (!sb) throw new Error("Service unavailable — please try again");
      if (mode === "signup") {
        const { data, error: e } = await sb.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() } } });
        if (e) throw e;
        if (data.user && !data.session) setSuccess("Check your email to confirm your account, then sign in.");
        else if (data.session) onAuth(data.user);
      } else if (mode === "login") {
        const { data, error: e } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw e;
        onAuth(data.user);
      } else {
        const { error: e } = await sb.auth.resetPasswordForEmail(email.trim());
        if (e) throw e;
        setSuccess("Password reset link sent — check your email.");
      }
    } catch (e) {
      const msg = e.message || "Something went wrong";
      if (msg.includes("Invalid login")) setError("Incorrect email or password");
      else if (msg.includes("already registered")) setError("Account exists — try signing in");
      else setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0a0f1e,#0f1e3d)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"Inter,system-ui,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
            <div style={{ width:64, height:64, borderRadius:16, background:"linear-gradient(135deg,#1a2f5e,#0f1e3d)", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid rgba(201,168,76,0.4)", boxShadow:"0 4px 24px rgba(201,168,76,0.2)" }}>
              <svg viewBox="0 0 52 42" width="40" height="32">
                <defs>
                  <linearGradient id="aN" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6aaee8"/><stop offset="100%" stopColor="#1a2f5e"/></linearGradient>
                  <linearGradient id="aG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#e8c96a"/><stop offset="100%" stopColor="#a8873a"/></linearGradient>
                  <linearGradient id="aD" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6aaee8"/><stop offset="100%" stopColor="#1a5fa8"/></linearGradient>
                </defs>
                <text x="0" y="34" fontFamily="Georgia,serif" fontWeight="700" fontSize="34" fill="url(#aN)">F</text>
                <path d="M 26 1 C 26 1,18 14,18 20 C 18 26 21.5 30 26 30 C 30.5 30 34 26 34 20 C 34 14 26 1 26 1 Z" fill="url(#aD)"/>
                <ellipse cx="23" cy="15" rx="2.5" ry="4" fill="white" opacity="0.4" transform="rotate(-15 23 15)"/>
                <text x="30" y="34" fontFamily="Georgia,serif" fontWeight="700" fontSize="34" fill="url(#aG)">P</text>
              </svg>
            </div>
          </div>
          <div style={{ fontSize:24, fontWeight:900, letterSpacing:"2px", fontFamily:"Georgia,serif" }}>
            <span style={{ color:"#e2e8f0" }}>POOL </span><span style={{ color:"#c9a84c" }}>CRAFT </span><span style={{ color:"#e2e8f0" }}>PRO</span>
          </div>
          <div style={{ fontSize:11, color:"#8a9ab5", letterSpacing:"2px", textTransform:"uppercase", marginTop:6 }}>Design Pools. Craft Outdoor Living.</div>
        </div>

        {/* Card */}
        <div style={{ background:"#111827", border:"1px solid #1e293b", borderRadius:20, padding:28, boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize:18, fontWeight:800, color:"#e2e8f0", marginBottom:4 }}>
            {mode==="login" ? "Sign In" : mode==="signup" ? "Create Account" : "Reset Password"}
          </div>
          <div style={{ fontSize:13, color:"#64748b", marginBottom:24 }}>
            {mode==="login" ? "Welcome back — sign in to access your designs" : mode==="signup" ? "Start your free trial — no credit card needed" : "We'll send you a reset link"}
          </div>

          {mode==="signup" && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, color:"#64748b", marginBottom:6 }}>Full Name</div>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:10, padding:"11px 14px", color:"#e2e8f0", fontSize:14, outline:"none", boxSizing:"border-box" }}/>
            </div>
          )}

          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, color:"#64748b", marginBottom:6 }}>Email Address</div>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder="you@example.com" style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:10, padding:"11px 14px", color:"#e2e8f0", fontSize:14, outline:"none", boxSizing:"border-box" }}/>
          </div>

          {mode!=="reset" && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, color:"#64748b", marginBottom:6 }}>Password</div>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder={mode==="signup"?"Min 8 characters":"Your password"} style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:10, padding:"11px 14px", color:"#e2e8f0", fontSize:14, outline:"none", boxSizing:"border-box" }}/>
            </div>
          )}

          {error && <div style={{ marginBottom:14, padding:"10px 14px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, fontSize:13, color:"#ef4444" }}>⚠️ {error}</div>}
          {success && <div style={{ marginBottom:14, padding:"10px 14px", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:10, fontSize:13, color:"#22c55e" }}>✅ {success}</div>}

          <button onClick={handleSubmit} disabled={loading} style={{ width:"100%", padding:14, borderRadius:12, border:"none", background:loading?"#1e293b":`linear-gradient(135deg,#c9a84c,#a8873a)`, color:loading?"#64748b":"#0a0f1e", fontWeight:800, fontSize:15, cursor:loading?"not-allowed":"pointer" }}>
            {loading ? "Please wait..." : mode==="login" ? "Sign In" : mode==="signup" ? "Create Account" : "Send Reset Link"}
          </button>

          <div style={{ marginTop:20, display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
            {mode==="login" && <button onClick={()=>{setMode("signup");setError(null);}} style={{ background:"none", border:"none", color:"#c9a84c", fontSize:13, cursor:"pointer" }}>Don't have an account? Sign up free</button>}
            {mode==="signup" && <button onClick={()=>{setMode("login");setError(null);}} style={{ background:"none", border:"none", color:"#c9a84c", fontSize:13, cursor:"pointer" }}>Already have an account? Sign in</button>}
            {mode==="login" && <button onClick={()=>{setMode("reset");setError(null);}} style={{ background:"none", border:"none", color:"#64748b", fontSize:12, cursor:"pointer" }}>Forgot password?</button>}
            {mode==="reset" && <button onClick={()=>{setMode("login");setError(null);}} style={{ background:"none", border:"none", color:"#64748b", fontSize:12, cursor:"pointer" }}>← Back to sign in</button>}
          </div>
        </div>
        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:"#334155" }}>
          By signing up you agree to our <a href="/privacy" style={{ color:"#64748b" }}>Privacy Policy</a> and <a href="/terms" style={{ color:"#64748b" }}>Terms of Service</a>
        </div>
      </div>
    </div>
  );
}

export default function PoolCraftPro() {
  const { user, session, authLoading, signOut, refreshUser } = useAuth();
  const [authedUser, setAuthedUser] = useState(null);
  const [tab, setTab] = useState(0);
  const [shape, setShape] = useState("rectangle");
  const [len, setLen] = useState(30);
  const [wid, setWid] = useState(15);
  const [depthId, setDepthId] = useState("standard");
  const [finishId, setFinishId] = useState("pebble");
  const [colorId, setColorId] = useState("caribbean");
  const [entries, setEntries] = useState({});
  const [hardscapes, setHardscapes] = useState({});
  const [extras, setExtras] = useState({ heater:true, sanitization:"salt", waterFeature:false });
  const [shopCat, setShopCat] = useState("tile");
  const [equipmentBrand, setEquipmentBrand] = useState(() => { try { return localStorage.getItem("pc_equip_brand") || "pentair"; } catch { return "pentair"; } });
  const [wishlist, setWishlist] = useState([]);
  const [guideMode, setGuideMode] = useState("contractor");
  const [bgPhoto, setBgPhoto] = useState(null);
  const [address, setAddress] = useState("");
  const [parcelStatus, setParcelStatus] = useState(null);
  const [parcelData, setParcelData] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [localRates, setLocalRates] = useState({ multiplier:1, laborMultiplier:1 });
  const [plasterFinishType, setPlasterFinishType] = useState("plaster");
  const [plasterCoveragePerBag, setPlasterCoveragePerBag] = useState(PLASTER_COVERAGE_PRESETS.plaster);
  const [plasterCostPerBag, setPlasterCostPerBag] = useState("");
  const [plasterWasteFactor, setPlasterWasteFactor] = useState(10);
  // Contractor's own financing partner links (e.g. Wisetack, Hearth, Synchrony,
  // GreenSky) - just referral URLs the contractor already has, not a live
  // financing API integration (that'd need its own vendor account/approval).
  // Shared across Settings (editing) and Cost Estimator/Quote Builder (display).
  const [financingLinks, setFinancingLinks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pc_financing_links") || "[]"); } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem("pc_financing_links", JSON.stringify(financingLinks)); } catch {} }, [financingLinks]);
  const [reviewLinks, setReviewLinks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pc_review_links") || "{}"); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem("pc_review_links", JSON.stringify(reviewLinks)); } catch {} }, [reviewLinks]);

  const [dailyRenders, setDailyRenders] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem("pc_daily")||"{}"); const today = new Date().toDateString(); return saved.date === today ? (saved.count||0) : 0; } catch { return 0; }
  });

  // Render plan: Basic ($99/mo, 10/day), Pro ($149/mo, 25/day), or Team
  // ($149/seat/mo, 25/day PER seat). All require an active Stripe
  // subscription - there's no free tier. The subscriber's own plan lives on
  // their Supabase account metadata, set only by the Stripe webhook. An
  // invited teammate has no subscription of their own - their access instead
  // comes from being an active row in team_members (see TEAM_SETUP_SQL and
  // teamMembership below), which is why this app-wide "is this account on a
  // paid tier" check now needs a live Supabase read, not just a metadata read.
  const rawPlan = user?.user_metadata?.plan;
  const ownPlan = rawPlan === "pro" ? "pro" : rawPlan === "team" ? "team" : rawPlan === "basic" ? "basic" : "none";
  const [teamMembership, setTeamMembership] = useState(null); // { teamId, seats } if I'm an active member of a team plan (my own or someone else's)

  useEffect(() => {
    if (!user) { setTeamMembership(null); return; }
    let ignore = false;
    (async () => {
      const sb = await loadSupabase();
      if (!sb || ignore) return;
      try {
        // Auto-activate a pending invite that matches my email, if one exists.
        await sb.from("team_members")
          .update({ user_id: user.id, status: "active", joined_at: new Date().toISOString() })
          .is("user_id", null).ilike("email", user.email).eq("status", "pending");
        const { data } = await sb.from("team_members")
          .select("team_id, teams(seats)").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
        if (!ignore && data) setTeamMembership({ teamId: data.team_id, seats: data.teams?.seats || 1 });
        else if (!ignore) setTeamMembership(null);
      } catch { if (!ignore) setTeamMembership(null); } // team tables not set up yet - fine, just no team access via invite
    })();
    return () => { ignore = true; };
  }, [user?.id, user?.email]);

  const plan = ownPlan !== "none" ? ownPlan : (teamMembership ? "team" : "none");
  const seats = Math.max(1, Number(user?.user_metadata?.seats) || 1);
  const DAILY_RENDER_LIMIT = plan === "team" ? PLANS.team.dailyLimitPerSeat : (PLANS[plan]?.dailyLimit || 0);

  const bumpDailyRender = () => {
    const newCount = dailyRenders + 1; setDailyRenders(newCount);
    try { localStorage.setItem("pc_daily", JSON.stringify({ date: new Date().toDateString(), count: newCount })); } catch {}
    return newCount;
  };

  const [showOnboarding, setShowOnboarding] = useState(() => { try { return !localStorage.getItem("pc_onboarded"); } catch { return true; } });
  const [userMode, setUserMode] = useState(() => { try { return localStorage.getItem("pc_mode")||"contractor"; } catch { return "contractor"; } });
  const [showProjects, setShowProjects] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState("My Pool Project");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState("");
  const [saveClientInput, setSaveClientInput] = useState("");
  const [saveClientEmailInput, setSaveClientEmailInput] = useState("");
  const [saveClientPhoneInput, setSaveClientPhoneInput] = useState("");
  const [saveShowContactFields, setSaveShowContactFields] = useState(false);
  const [clientName, setClientName] = useState(null);
  const [clientEmail, setClientEmail] = useState(null);
  const [clientPhone, setClientPhone] = useState(null);
  const [savedToast, setSavedToast] = useState(false);
  const [savedToastMsg, setSavedToastMsg] = useState("✅ Project saved!");
  const [savingInProgress, setSavingInProgress] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const [showSplash, setShowSplash] = useState(() => { try { return !localStorage.getItem("pc_launched"); } catch { return true; } });
  const [showShare, setShowShare] = useState(false);
  const [unsavedConfirm, setUnsavedConfirm] = useState(null);

  // Demo mode — loads a sample pool so contractors can show the app during sales visits
  const activateDemo = () => {
    setShape("freeform"); setLen(40); setWid(20); setDepthId("standard");
    setFinishId("pebble"); setColorId("caribbean");
    setEntries({ beach_entry: true, baja_shelf: true, spa_attached: true });
    setHardscapes({ fire_pit: 1, outdoor_kitchen: 1, pergola: 1 });
    setExtras({ heater: true, sanitization: "salt", waterFeature: true });
    setProjectName("Demo — Lagoon Pool"); setClientName("Sample Client");
    setClientEmail("client@example.com");
    setDemoMode(true); setTab(0);
    try { localStorage.setItem("pc_mode","contractor"); } catch {}
  };
  const exitDemo = () => {
    setShape("rectangle"); setLen(30); setWid(15); setDepthId("standard");
    setFinishId("pebble"); setColorId("caribbean");
    setEntries({}); setHardscapes({}); setExtras({ heater:true, sanitization:"salt", waterFeature:false });
    setProjectName("My Pool Project"); setClientName(null); setClientEmail(null);
    setDemoMode(false);
  };

  // ── Unsaved changes tracking ──
  // Snapshot the design-relevant fields right after a save or load; compare
  // against current state to know whether navigating away would lose work.
  const lastSavedSnapshot = useRef(null);
  const designSnapshot = useMemo(() => JSON.stringify({
    shape, len, wid, depthId, finishId, colorId, entries, hardscapes, extras, address, localRates,
    clientName, clientEmail, clientPhone, projectName,
  }), [shape, len, wid, depthId, finishId, colorId, entries, hardscapes, extras, address, localRates, clientName, clientEmail, clientPhone, projectName]);
  const isDirty = lastSavedSnapshot.current !== null && lastSavedSnapshot.current !== designSnapshot;
  const markSnapshotClean = () => { lastSavedSnapshot.current = designSnapshot; };
  useEffect(() => { if (lastSavedSnapshot.current === null) markSnapshotClean(); }, []); // eslint-disable-line
  useEffect(() => {
    const handler = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ""; return ""; } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
  const materials = useMemo(()=>calcMaterials(shape,len,wid,depthId,finishId),[shape,len,wid,depthId,finishId]);
  const plasterConfig = useMemo(() => ({
    finishType: plasterFinishType, coveragePerBag: plasterCoveragePerBag, costPerBag: plasterCostPerBag, wasteFactor: plasterWasteFactor,
  }), [plasterFinishType, plasterCoveragePerBag, plasterCostPerBag, plasterWasteFactor]);
  // Reuses materials.finishSqFt - the same floor+walls surface area (calcMaterials'
  // "shell") already shown as "Interior Finish Area" elsewhere in this tab and
  // fed into the cost estimator/quote builder's finish line item.
  const plasterCalc = useMemo(() => {
    const surfaceAreaSqFt = materials.finishSqFt;
    const coverage = Number(plasterCoveragePerBag) > 0 ? Number(plasterCoveragePerBag) : 32;
    const waste = Number(plasterWasteFactor) || 0;
    const bagsNeeded = Math.ceil((surfaceAreaSqFt * (1 + waste / 100)) / coverage);
    const costPerBagNum = Number(plasterCostPerBag);
    const hasCost = plasterCostPerBag !== "" && costPerBagNum > 0;
    const totalMaterialCost = hasCost ? bagsNeeded * costPerBagNum : null;
    return { surfaceAreaSqFt, coverage, waste, bagsNeeded, hasCost, totalMaterialCost };
  }, [materials.finishSqFt, plasterCoveragePerBag, plasterWasteFactor, plasterCostPerBag]);
  const equipment = useMemo(() => {
    const brand = EQUIPMENT_BRANDS.find(b => b.id === equipmentBrand) || EQUIPMENT_BRANDS[0];
    return brand.getEquipment(materials.gallons, extras);
  }, [materials.gallons, extras, equipmentBrand]);

  // Returning from Stripe Checkout - the webhook flips user_metadata.plan
  // server-side, but this tab's cached session doesn't know that yet, so poll
  // a few times for the fresh value instead of assuming one refresh is enough.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;
    window.history.replaceState(null, "", window.location.pathname);
    if (checkout === "success") {
      setSavedToastMsg("✅ Payment successful - activating your plan...");
      setSavedToast(true); setTimeout(()=>setSavedToast(false), 4000);
      let tries = 0;
      const poll = setInterval(async () => {
        tries++;
        const u = await refreshUser();
        if (u?.user_metadata?.plan || tries >= 6) clearInterval(poll);
      }, 1500);
    } else if (checkout === "cancelled") {
      setSavedToastMsg("Checkout cancelled - no charge was made.");
      setSavedToast(true); setTimeout(()=>setSavedToast(false), 3000);
    }
  }, []); // eslint-disable-line

  // Show login screen until authenticated
  if (authLoading) return (
    <div style={{ minHeight:"100vh", background:"#0a0f1e", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"Georgia,serif", fontSize:20, fontWeight:900, letterSpacing:"2px", color:"#c9a84c", marginBottom:16 }}>POOL CRAFT PRO</div>
        <div style={{ color:"#64748b", fontSize:13 }}>Loading...</div>
      </div>
    </div>
  );

  if (!user && !authedUser && SUPABASE_URL) return <AuthScreen onAuth={u => setAuthedUser(u)} />;

  const currentUser = user || authedUser || { id: "local", email: "user@local", guest: true };

  // Run `action` immediately if there's nothing to lose, otherwise ask first
  const withUnsavedCheck = (action) => { if (isDirty) setUnsavedConfirm(() => action); else action(); };

  const completeSplash = () => { try { localStorage.setItem("pc_launched","1"); } catch {} setShowSplash(false); };
  const completeOnboarding = () => { try { localStorage.setItem("pc_onboarded","1"); localStorage.setItem("pc_mode", userMode); } catch {} setShowOnboarding(false); };

  const saveProject = async () => {
    const name = saveNameInput.trim() || projectName;
    const id = projectId || Date.now();
    setSavingInProgress(true);
    const project = {
      id, name, savedAt: Date.now(),
      clientName: saveClientInput.trim() || clientName || null,
      clientEmail: saveClientEmailInput.trim() || clientEmail || null,
      clientPhone: saveClientPhoneInput.trim() || clientPhone || null,
      shape, len, wid, depthId, finishId, colorId, entries, hardscapes, extras, address, localRates,
      gallons: materials.gallons,
      entryCount: Object.keys(entries).length,
      hardscapeCount: Object.keys(hardscapes).filter(k=>hardscapes[k]!=null).length,
      finish: POOL_FINISHES.find(f=>f.id===finishId)?.label || finishId,
    };
    const savedToCloud = await saveProjectRecord(project);
    setSavingInProgress(false);
    setProjectId(id);
    setProjectName(name);
    setClientName(project.clientName);
    setClientEmail(project.clientEmail);
    setClientPhone(project.clientPhone);
    setShowSaveDialog(false); setSaveNameInput(""); setSaveClientInput(""); setSaveClientEmailInput(""); setSaveClientPhoneInput("");
    const cloudConfigured = !!(getSupabaseConfig().url && getSupabaseConfig().key);
    setSavedToastMsg(cloudConfigured && !savedToCloud ? "✅ Saved to this device (cloud sync had an issue)" : cloudConfigured ? "✅ Saved & synced to the cloud" : "✅ Project saved!");
    setSavedToast(true); setTimeout(()=>setSavedToast(false), 2800);
    markSnapshotClean();
  };

  const loadProject = (p) => {
    setProjectId(p.id);
    setClientEmail(p.clientEmail||null);
    setClientPhone(p.clientPhone||null);
    setClientName(p.clientName||null);
    setShape(p.shape||"rectangle"); setLen(p.len||30); setWid(p.wid||15);
    setDepthId(p.depthId||"standard"); setFinishId(p.finishId||"pebble"); setColorId(p.colorId||"caribbean");
    setEntries(p.entries||{}); setHardscapes(p.hardscapes||{});
    setExtras(p.extras||{heater:true,sanitization:"salt",waterFeature:false});
    setLocalRates(p.localRates||{multiplier:1,laborMultiplier:1});
    setAddress(p.address||""); setProjectName(p.name||"My Pool Project");
    setShowProjects(false); setTab(0);
    setTimeout(markSnapshotClean, 0);
  };

  const startNewProject = () => {
    setProjectId(null); setProjectName("New Pool Project"); setClientName(null); setClientEmail(null); setClientPhone(null);
    setShape("rectangle"); setLen(30); setWid(15); setDepthId("standard");
    setFinishId("pebble"); setColorId("caribbean"); setEntries({}); setHardscapes({});
    setExtras({heater:true,sanitization:"salt",waterFeature:false});
    setLocalRates({multiplier:1,laborMultiplier:1});
    setAddress(""); setParcelData(null); setParcelStatus(null); setShowMap(false);
    setBgPhoto(null); setTab(0);
    setTimeout(markSnapshotClean, 0);
  };

  const exportPDF = () => generatePDF({ projectName, shape, len, wid, depthId, finishId, colorId, materials, equipment, entries, hardscapes, parcelData });

  const toggleEntry = (id) => setEntries(p => p[id] ? (({[id]:_,...r})=>r)(p) : {...p,[id]:true});
  const toggleHardscape = (id) => setHardscapes(p => p[id]!=null ? (({[id]:_,...r})=>r)(p) : {...p,[id]:100});
  const setHSQty = (id, v) => setHardscapes(p => { const n = Number(v); const safe = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0; return {...p,[id]:safe}; });
  const toggleWishlist = (name) => setWishlist(p => p.includes(name)?p.filter(x=>x!==name):[...p,name]);

  const poolColor = POOL_COLORS.find(c=>c.id===colorId)||POOL_COLORS[1];
  const activeCat = SHOP_CATEGORIES.find(c=>c.id===shopCat);
  const activeEntries = ENTRY_FEATURES.filter(e=>entries[e.id]);

  const lookupAddress = async () => {
    if (!address.trim()) return;
    setParcelStatus("loading"); setParcelData(null); setShowMap(false);
    try { const data = await lookupParcel(address); setParcelData(data); setParcelStatus("found"); setShowMap(true); }
    catch(err) { setParcelStatus("error"); }
  };

  const card = {background:"#111827",border:"1px solid #1e293b",borderRadius:16,padding:18};
  const sectionTitle = {fontSize:11,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12};
  const chip = (active,color="#06b6d4")=>({padding:"8px 14px",borderRadius:20,border:`2px solid ${active?color:"#334155"}`,background:active?`${color}22`:"#1e293b",color:active?color:"#94a3b8",cursor:"pointer",fontSize:12,fontWeight:600,transition:"all 0.15s"});

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:"#0b1120",minHeight:"100vh",color:"#e2e8f0"}}>
      {showSplash && <SplashScreen onDone={completeSplash} />}
      {showShare && <ShareDesign projectName={projectName} clientName={clientName} clientEmail={clientEmail} clientPhone={clientPhone} shape={shape} len={len} wid={wid} depthId={depthId} finishId={finishId} colorId={colorId} entries={entries} hardscapes={hardscapes} materials={materials} onClose={()=>setShowShare(false)} />}
      {showOnboarding && <OnboardingModal onComplete={completeOnboarding} userMode={userMode} setUserMode={setUserMode} setLen={setLen} setWid={setWid} setShape={setShape} setDepthId={setDepthId} setFinishId={setFinishId} />}
      {showProjects && <ProjectManager currentProjectId={projectId} onLoad={(p)=>withUnsavedCheck(()=>loadProject(p))} onClose={()=>setShowProjects(false)} />}

      {showSaveDialog && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:16,padding:24,width:"100%",maxWidth:380}}>
            <div style={{fontSize:15,fontWeight:800,color:"#e2e8f0",marginBottom:16}}>💾 {projectId?"Update":"Save"} Project</div>
            <input value={saveNameInput} onChange={e=>setSaveNameInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveProject()}
              placeholder="Project name e.g. Smith Residence Pool"
              style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"11px 14px",color:"#e2e8f0",fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:10}} />
            <input value={saveClientInput} onChange={e=>setSaveClientInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveProject()}
              placeholder="Client name (optional) e.g. John & Mary Smith"
              style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"11px 14px",color:"#e2e8f0",fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:saveShowContactFields?10:12}} />
            {saveShowContactFields ? (
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                <input type="email" value={saveClientEmailInput} onChange={e=>setSaveClientEmailInput(e.target.value)} placeholder="Client email (optional)"
                  style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"10px 14px",color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}} />
                <input type="tel" value={saveClientPhoneInput} onChange={e=>setSaveClientPhoneInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveProject()} placeholder="Client phone (optional)"
                  style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"10px 14px",color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}} />
              </div>
            ) : (
              <button onClick={()=>setSaveShowContactFields(true)} style={{background:"none",border:"none",color:"#06b6d4",fontSize:11,fontWeight:600,cursor:"pointer",padding:0,marginBottom:12}}>+ Add client email or phone (lets you share designs directly)</button>
            )}
            <div style={{fontSize:11,color:"#64748b",marginBottom:14}}>{len}'x{wid}' {POOL_SHAPES.find(s=>s.id===shape)?.label} - {materials.gallons.toLocaleString()} gal - {Object.keys(entries).length} features</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowSaveDialog(false)} style={{flex:1,padding:"11px",borderRadius:10,border:"1px solid #334155",background:"#1e293b",color:"#94a3b8",fontWeight:700,fontSize:13,cursor:"pointer"}}>Cancel</button>
              <button onClick={saveProject} disabled={savingInProgress} style={{flex:2,padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"white",fontWeight:800,fontSize:13,cursor:savingInProgress?"not-allowed":"pointer",opacity:savingInProgress?0.7:1}}>{savingInProgress?"Saving...":"Save Project"}</button>
            </div>
          </div>
        </div>
      )}

      {savedToast && (<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"rgba(34,197,94,0.95)",borderRadius:20,padding:"10px 20px",fontSize:13,fontWeight:700,color:"white",zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.4)",whiteSpace:"nowrap"}}>{savedToastMsg}</div>)}

      {unsavedConfirm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",zIndex:1001,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:16,padding:24,width:"100%",maxWidth:380}}>
            <div style={{fontSize:32,marginBottom:10}}>⚠️</div>
            <div style={{fontSize:15,fontWeight:800,color:"#e2e8f0",marginBottom:8}}>You have unsaved changes</div>
            <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6,marginBottom:18}}>{projectName} has edits that haven't been saved yet. If you continue, those changes will be lost.</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={async ()=>{ const action=unsavedConfirm; setUnsavedConfirm(null); await saveProject(); if(action) action(); }}
                style={{padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"white",fontWeight:800,fontSize:13,cursor:"pointer"}}>💾 Save, Then Continue</button>
              <button onClick={()=>{ const action=unsavedConfirm; setUnsavedConfirm(null); if(action) action(); }}
                style={{padding:"12px",borderRadius:10,border:"1px solid rgba(239,68,68,0.4)",background:"rgba(239,68,68,0.12)",color:"#ef4444",fontWeight:700,fontSize:13,cursor:"pointer"}}>Discard Changes & Continue</button>
              <button onClick={()=>setUnsavedConfirm(null)} style={{padding:"12px",borderRadius:10,border:"1px solid #334155",background:"#1e293b",color:"#94a3b8",fontWeight:700,fontSize:13,cursor:"pointer"}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{background:"linear-gradient(135deg,#0a0f1e 0%,#0f1e3d 60%,#0a0f1e 100%)",padding:"14px 16px 0",borderBottom:"1px solid rgba(201,168,76,0.2)"}}>
        {/* Row 1: logo mark + wordmark + mode badge */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#1a2f5e,#0f1e3d)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"1px solid rgba(201,168,76,0.35)",boxShadow:"0 2px 12px rgba(201,168,76,0.15)"}}>
            <svg viewBox="0 0 52 42" width="30" height="24">
              <defs>
                <linearGradient id="hN" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4a7ab5"/><stop offset="100%" stopColor="#1a2f5e"/></linearGradient>
                <linearGradient id="hG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#e8c96a"/><stop offset="100%" stopColor="#a8873a"/></linearGradient>
                <linearGradient id="hD" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6aaee8"/><stop offset="100%" stopColor="#1a5fa8"/></linearGradient>
              </defs>
              <text x="0" y="34" fontFamily="Georgia,serif" fontWeight="700" fontSize="34" fill="url(#hN)">F</text>
              <path d="M 26 1 C 26 1,18 14,18 20 C 18 26 21.5 30 26 30 C 30.5 30 34 26 34 20 C 34 14 26 1 26 1 Z" fill="url(#hD)"/>
              <ellipse cx="23" cy="15" rx="2.5" ry="4" fill="white" opacity="0.4" transform="rotate(-15 23 15)"/>
              <text x="30" y="34" fontFamily="Georgia,serif" fontWeight="700" fontSize="34" fill="url(#hG)">P</text>
            </svg>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:900,fontSize:15,letterSpacing:"1.5px",fontFamily:"Georgia,serif",lineHeight:1.1}}>
              <span style={{color:"#dde6f0"}}>POOL </span><span style={{color:"#c9a84c"}}>CRAFT </span><span style={{color:"#dde6f0"}}>PRO</span>
            </div>
            <div style={{fontSize:11,color:"#8a9ab5",display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",marginTop:2}}>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{clientName?`${clientName} · `:""}{projectName}</span>
              {(!projectId || isDirty) && (
                <span style={{display:"inline-flex",alignItems:"center",gap:3,color:"#c9a84c",fontWeight:700,flexShrink:0}}>
                  <span style={{width:5,height:5,borderRadius:"50%",background:"#c9a84c"}}></span>
                  {!projectId ? "unsaved" : "unsaved changes"}
                </span>
              )}
            </div>
          </div>
          <div onClick={()=>setShowOnboarding(true)} style={{padding:"6px 10px",borderRadius:16,background:userMode==="homeowner"?"rgba(34,197,94,0.15)":userMode==="designer"?"rgba(201,168,76,0.15)":"rgba(74,122,181,0.2)",border:`1px solid ${userMode==="homeowner"?"rgba(34,197,94,0.3)":userMode==="designer"?"rgba(201,168,76,0.35)":"rgba(74,122,181,0.4)"}`,fontSize:10,color:userMode==="homeowner"?"#22c55e":userMode==="designer"?"#c9a84c":"#7ab0e8",fontWeight:700,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
            {userMode==="homeowner"?"🏠 HO":userMode==="designer"?"🎨 Design":"👷 Pro"}
          </div>
          {currentUser && !currentUser.guest && (
            <button onClick={signOut} style={{padding:"6px 10px",borderRadius:16,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0}}>Sign Out</button>
          )}
        </div>
        {/* Demo mode banner */}
        {demoMode && (
          <div style={{background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.4)",borderRadius:10,padding:"8px 12px",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <div style={{fontSize:12,color:"#f59e0b",fontWeight:700}}>🎯 Demo Mode — Showing sample lagoon pool to client</div>
            <button onClick={exitDemo} style={{padding:"4px 12px",borderRadius:10,background:"rgba(245,158,11,0.2)",border:"1px solid rgba(245,158,11,0.4)",color:"#f59e0b",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>Exit Demo</button>
          </div>
        )}
        {/* Row 2: action buttons */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
          <button onClick={()=>withUnsavedCheck(startNewProject)} style={{padding:"7px 12px",minHeight:34,borderRadius:16,background:"rgba(201,168,76,0.1)",border:"1px solid rgba(201,168,76,0.3)",color:"#c9a84c",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>➕ New</button>
          <button onClick={()=>{setSaveNameInput(projectName);setSaveClientInput(clientName||"");setSaveClientEmailInput(clientEmail||"");setSaveClientPhoneInput(clientPhone||"");setSaveShowContactFields(!!(clientEmail||clientPhone));setShowSaveDialog(true);}} style={{padding:"7px 12px",minHeight:34,borderRadius:16,background:"rgba(34,197,94,0.12)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>💾 Save</button>
          <button onClick={()=>setShowProjects(true)} style={{padding:"7px 12px",minHeight:34,borderRadius:16,background:"rgba(74,122,181,0.12)",border:"1px solid rgba(74,122,181,0.3)",color:"#7ab0e8",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>📂 Projects</button>
          <button onClick={exportPDF} style={{padding:"7px 12px",minHeight:34,borderRadius:16,background:"rgba(201,168,76,0.1)",border:"1px solid rgba(201,168,76,0.25)",color:"#c9a84c",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>📄 PDF</button>
          <button onClick={()=>setShowShare(true)} style={{padding:"7px 12px",minHeight:34,borderRadius:16,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",color:"#a78bfa",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>📤 Share</button>
          {!demoMode && <button onClick={activateDemo} style={{padding:"7px 12px",minHeight:34,borderRadius:16,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",color:"#f59e0b",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>🎯 Demo</button>}
          {wishlist.length>0&&<div style={{padding:"7px 10px",minHeight:34,display:"flex",alignItems:"center",borderRadius:16,background:"rgba(201,168,76,0.1)",border:"1px solid rgba(201,168,76,0.3)",fontSize:12,color:"#c9a84c",flexShrink:0}}>❤️ {wishlist.length}</div>}
        </div>
        {/* Row 3: tab navigation */}
        <div style={{display:"flex",overflowX:"auto",gap:2}}>
          {NAV_TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{whiteSpace:"nowrap",padding:"12px 12px",minHeight:44,fontSize:11,fontWeight:700,border:"none",cursor:"pointer",borderRadius:"8px 8px 0 0",background:tab===t.id?"#060a14":"transparent",color:tab===t.id?"#c9a84c":"#5a6a80",borderBottom:tab===t.id?"2px solid #c9a84c":"2px solid transparent"}}>{t.icon} {t.label}</button>))}
        </div>
      </div>

      <div style={{padding:"16px 14px",maxWidth:820,margin:"0 auto",display:"flex",flexDirection:"column",gap:14}}>

        {tab===0&&<>
          <div style={card}>
            <div style={sectionTitle}>Pool Shape</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{POOL_SHAPES.map(s=><button key={s.id} onClick={()=>setShape(s.id)} style={chip(shape===s.id)}>{s.icon} {s.label}</button>)}</div>
            <div style={{marginTop:10,fontSize:12,color:"#64748b"}}>💡 {POOL_SHAPES.find(s=>s.id===shape)?.desc}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[{label:"Length (ft)",val:len,set:setLen,min:10,max:120},{label:"Width (ft)",val:wid,set:setWid,min:8,max:60}].map(f=>{
              const clamp = (raw) => {
                if (raw === "" || raw === "-") return null; // let them keep typing
                const n = Number(raw);
                if (!Number.isFinite(n)) return f.val;
                return Math.round(n);
              };
              const handleChange = (e) => {
                const result = clamp(e.target.value);
                if (result !== null) f.set(result);
              };
              const handleBlur = (e) => {
                const n = Number(e.target.value);
                if (e.target.value === "" || !Number.isFinite(n)) { f.set(f.min); return; }
                f.set(Math.max(f.min, Math.min(f.max, Math.round(n))));
              };
              const outOfRange = f.val < f.min || f.val > f.max;
              return (
                <div key={f.label} style={card}>
                  <div style={{...sectionTitle,marginBottom:8}}>{f.label}</div>
                  <input type="number" inputMode="numeric" value={f.val} min={f.min} max={f.max} onChange={handleChange} onBlur={handleBlur}
                    style={{width:"100%",background:"#1e293b",border:`1px solid ${outOfRange?"#ef4444":"#334155"}`,borderRadius:10,padding:"10px 12px",color:outOfRange?"#ef4444":"#06b6d4",fontSize:20,fontWeight:800,outline:"none",boxSizing:"border-box"}}/>
                  <input type="range" min={f.min} max={f.max} value={Math.max(f.min,Math.min(f.max,f.val))} onChange={handleChange} style={{width:"100%",marginTop:8,accentColor:"#c9a84c"}}/>
                  {outOfRange && <div style={{fontSize:11,color:"#ef4444",marginTop:6}}>Valid range is {f.min}-{f.max} ft - will snap back when you tap away</div>}
                </div>
              );
            })}
          </div>
          <div style={card}>
            <div style={sectionTitle}>Depth Profile</div>
            {DEPTHS.map(d=>(<button key={d.id} onClick={()=>setDepthId(d.id)} style={{display:"block",width:"100%",textAlign:"left",padding:"11px 14px",marginBottom:6,borderRadius:10,border:`2px solid ${depthId===d.id?"#06b6d4":"#334155"}`,background:depthId===d.id?"rgba(6,182,212,0.08)":"#1e293b",color:depthId===d.id?"#e2e8f0":"#94a3b8",cursor:"pointer"}}><div style={{fontWeight:700,fontSize:13}}>{depthId===d.id?"✓ ":""}{d.label}</div><div style={{fontSize:11,color:"#64748b",marginTop:3}}>{d.desc}</div></button>))}
          </div>
          <div style={card}>
            <div style={sectionTitle}>Interior Finish</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{POOL_FINISHES.map(f=><button key={f.id} onClick={()=>setFinishId(f.id)} style={chip(finishId===f.id)}>{f.label}</button>)}</div>
            <div style={{marginTop:10,fontSize:12,color:"#64748b"}}>💡 {POOL_FINISHES.find(f=>f.id===finishId)?.desc}</div>
          </div>
          <div style={card}>
            <div style={sectionTitle}>Water Color</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:10}}>{POOL_COLORS.map(c=>(<button key={c.id} onClick={()=>setColorId(c.id)} style={{padding:"6px 12px",borderRadius:20,border:`2px solid ${colorId===c.id?"#fff":"#334155"}`,background:c.hex,color:["#e8f4f8","#d4a76a"].includes(c.hex)?"#1e293b":"#fff",cursor:"pointer",fontSize:12,fontWeight:700,opacity:colorId===c.id?1:0.65,transition:"all 0.15s"}}>{c.label}</button>))}</div>
          </div>

          <div style={card}>
            <div style={sectionTitle}>🧊 3D Preview</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:10}}>An instant 3D model from your dimensions, shape, depth, and finish — no photo needed. Rotate it to check proportions before generating an AI rendering below.</div>
            <Pool3D poolLen={len} poolWid={wid} poolShape={shape} poolColor={poolColor.hex} depthId={depthId} entries={entries} finishId={finishId} />
          </div>

          <div style={card}>
            <div style={sectionTitle}>✨ AI Pool Rendering</div>
            <AIRenderingPanel bgPhoto={bgPhoto} setBgPhoto={setBgPhoto} shape={shape} poolColor={poolColor.hex} len={len} wid={wid} finish={finishId} colorId={colorId} entries={entries} hardscapes={hardscapes} dailyRenders={dailyRenders} dailyLimit={DAILY_RENDER_LIMIT} onRenderComplete={bumpDailyRender} />
          </div>

          <div style={card}>
            <div style={sectionTitle}>📍 Property Lookup & Pool Placement</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:10}}>Enter an address to pull parcel data, then drag the pool to its correct position for permit planning.</div>
            <div style={{display:"flex",gap:8}}>
              <input type="text" placeholder="123 Main St, City, State" value={address} onChange={e=>setAddress(e.target.value)} onKeyDown={e=>e.key==="Enter"&&lookupAddress()} style={{flex:1,background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"10px 14px",color:"#e2e8f0",fontSize:14,outline:"none"}}/>
              <button onClick={lookupAddress} disabled={parcelStatus==="loading"} style={{padding:"10px 16px",borderRadius:10,background:"linear-gradient(135deg,#06b6d4,#0284c7)",border:"none",color:"white",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0,opacity:parcelStatus==="loading"?0.6:1}}>{parcelStatus==="loading"?"⏳":"Search"}</button>
            </div>
            {parcelStatus==="found"&&parcelData&&<>
              <div style={{marginTop:12,background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:12,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:12,color:"#06b6d4",fontWeight:700}}>✅ Parcel Found - {parcelData.address}</div>
                  <div style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:parcelData.source==="regrid"?"rgba(34,197,94,0.15)":"rgba(245,158,11,0.15)",border:`1px solid ${parcelData.source==="regrid"?"rgba(34,197,94,0.3)":"rgba(245,158,11,0.3)"}`,color:parcelData.source==="regrid"?"#22c55e":"#f59e0b",fontWeight:700}}>{parcelData.source==="regrid"?"🟢 Live Regrid Data":"🟡 Estimated"}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[{label:"Parcel / APN",val:parcelData.parcel},{label:"Lot Size",val:parcelData.lot_size},{label:"Lot Sq Ft",val:parcelData.lot_sqft},{label:"Zoning",val:parcelData.zoning},{label:"Front Setback",val:parcelData.setback_front},{label:"Rear Setback",val:parcelData.setback_rear},{label:"Side Setback",val:parcelData.setback_side},{label:"Pool Setback",val:parcelData.pool_setback}].map(r=>(
                    <div key={r.label} style={{background:"#1e293b",borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>{r.label}</div><div style={{fontSize:13,fontWeight:700,color:"#e2e8f0",marginTop:2}}>{r.val}</div></div>
                  ))}
                </div>
              </div>
              {showMap&&<button onClick={()=>setTab(3)} style={{marginTop:12,width:"100%",padding:"12px",borderRadius:10,background:"linear-gradient(135deg,#06b6d4,#0284c7)",border:"none",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>🗺️ Open Site Plan Tab to Place Your Pool</button>}
            </>}
          </div>

          <div style={card}>
            <div style={sectionTitle}>☁️ Cloud Sync</div>
            <CloudSyncPanel />
          </div>
        </>}

        {tab===13&&<HowItWorksTab onSubscribeClick={()=>setTab(11)} />}

        {tab===1&&<>
          <div style={{fontSize:13,color:"#94a3b8",padding:"4px 0 8px"}}>Tap any feature to learn more and add it to your pool design.</div>
          {ENTRY_FEATURES.map(ef=>(<FeatureCard key={ef.id} feature={ef} active={!!entries[ef.id]} onToggle={()=>toggleEntry(ef.id)} />))}
          {Object.keys(entries).length > 0 && (
            <div style={{background:"linear-gradient(135deg,rgba(6,182,212,0.1),rgba(2,132,199,0.06))",border:"1px solid rgba(6,182,212,0.25)",borderRadius:12,padding:14,marginTop:4}}>
              <div style={{fontSize:12,color:"#06b6d4",fontWeight:700,marginBottom:8}}>✅ Selected Features ({Object.keys(entries).length})</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{ENTRY_FEATURES.filter(e=>entries[e.id]).map(e=>(<span key={e.id} style={{padding:"5px 12px",borderRadius:20,background:`${e.color}22`,border:`1px solid ${e.color}55`,color:e.color,fontSize:12,fontWeight:600}}>{e.icon} {e.label}</span>))}</div>
            </div>
          )}
        </>}

        {tab===2&&<HardscapeDesigner hardscapes={hardscapes} toggleHardscape={toggleHardscape} setHSQty={setHSQty} dailyRenders={dailyRenders} dailyLimit={DAILY_RENDER_LIMIT} bumpDailyRender={bumpDailyRender} />}

        {tab===3&&<SitePlanMap poolLen={len} poolWid={wid} poolShape={shape} poolColor={poolColor.hex} initialAddress={address} />}

        {tab===4&&<>
          <div style={{background:"linear-gradient(135deg,rgba(6,182,212,0.15),rgba(2,132,199,0.1))",border:"1px solid rgba(6,182,212,0.3)",borderRadius:14,padding:16}}>
            <div style={{fontSize:12,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>Pool Summary</div>
            <div style={{fontSize:15,fontWeight:700,color:"#e2e8f0",marginTop:4}}>{POOL_SHAPES.find(s=>s.id===shape)?.label} - {len}' x {wid}'</div>
            <div style={{fontSize:12,color:"#94a3b8",marginTop:3}}>{materials.gallons.toLocaleString()} gallons - {POOL_FINISHES.find(f=>f.id===finishId)?.label}</div>
          </div>
          {[{label:"Excavation",val:materials.excavation,note:"Includes 20% over-dig"},{label:"Gunite / Shotcrete",val:materials.gunite,note:"4 inch shell thickness"},{label:"Rebar",val:materials.rebar,note:"#3 rebar - 20 ft sticks - 12 inch on center grid - includes 15% lap splice"},{label:"Gravel Base",val:materials.gravel,note:"3/4 inch crushed stone 4 inch bed"},{label:"PVC Plumbing",val:materials.plumbing,note:"2 inch & 3 inch schedule 40"},{label:"Coping",val:materials.coping,note:"Bond beam perimeter"},{label:"Waterline Tile",val:materials.tile,note:"6 inch tile band"},{label:"Interior Finish",val:materials.finish,note:POOL_FINISHES.find(f=>f.id===finishId)?.label}].map(row=>(
            <div key={row.label} style={{background:"#111827",border:"1px solid #1e293b",borderRadius:12,padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontWeight:600,fontSize:14}}>{row.label}</div><div style={{fontSize:12,color:"#64748b",marginTop:2}}>{row.note}</div></div>
              <div style={{fontWeight:800,fontSize:16,color:"#06b6d4"}}>{row.val}</div>
            </div>
          ))}

          <div style={card}>
            <div style={sectionTitle}>🧴 Plaster Bag Calculator</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:14}}>Uses the same {Math.round(plasterCalc.surfaceAreaSqFt).toLocaleString()} sq ft interior surface area shown above as "Interior Finish Area" - floor + walls, from calcMaterials().</div>

            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              <div style={{flex:"1 1 160px"}}>
                <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Finish Type</div>
                <select value={plasterFinishType} onChange={(e)=>{ const id=e.target.value; setPlasterFinishType(id); setPlasterCoveragePerBag(PLASTER_COVERAGE_PRESETS[id]); }}
                  style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"9px 10px",color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}}>
                  {PLASTER_FINISH_OPTIONS.map(o=>(<option key={o.id} value={o.id}>{o.label}</option>))}
                </select>
              </div>
              <div style={{flex:"1 1 160px"}}>
                <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Coverage per Bag (sq ft)</div>
                <input type="number" min="1" value={plasterCoveragePerBag} onChange={(e)=>setPlasterCoveragePerBag(Math.max(1,Number(e.target.value)||1))}
                  style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"9px 10px",color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{flex:"1 1 160px"}}>
                <div style={{fontSize:10,color:"#f59e0b",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4,fontWeight:700}}>Cost per Bag ($) - Required</div>
                <input type="number" min="0" step="0.01" value={plasterCostPerBag} onChange={(e)=>setPlasterCostPerBag(e.target.value)} placeholder="Enter your supplier's price"
                  style={{width:"100%",background:"#1e293b",border:`1px solid ${plasterCalc.hasCost?"#334155":"rgba(245,158,11,0.5)"}`,borderRadius:8,padding:"9px 10px",color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{flex:"1 1 160px"}}>
                <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Waste Factor (%)</div>
                <input type="number" min="0" max="100" value={plasterWasteFactor} onChange={(e)=>setPlasterWasteFactor(Math.max(0,Number(e.target.value)||0))}
                  style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"9px 10px",color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:plasterCalc.hasCost?"1fr 1fr 1fr":"1fr 1fr",gap:8,marginBottom:10}}>
              <div style={{background:"#1e293b",borderRadius:8,padding:"9px 10px",textAlign:"center"}}>
                <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Surface Area</div>
                <div style={{fontSize:16,fontWeight:800,color:"#e2e8f0"}}>{Math.round(plasterCalc.surfaceAreaSqFt).toLocaleString()} sq ft</div>
              </div>
              <div style={{background:"#1e293b",borderRadius:8,padding:"9px 10px",textAlign:"center"}}>
                <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Bags Needed</div>
                <div style={{fontSize:16,fontWeight:800,color:"#06b6d4"}}>{plasterCalc.bagsNeeded.toLocaleString()}</div>
              </div>
              {plasterCalc.hasCost && (
                <div style={{background:"#1e293b",borderRadius:8,padding:"9px 10px",textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Total Material Cost</div>
                  <div style={{fontSize:16,fontWeight:800,color:"#22c55e"}}>${plasterCalc.totalMaterialCost.toLocaleString(undefined,{maximumFractionDigits:2})}</div>
                </div>
              )}
            </div>

            <div style={{fontSize:12,color:"#64748b",fontFamily:"monospace",background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,padding:"8px 12px"}}>
              {Math.round(plasterCalc.surfaceAreaSqFt).toLocaleString()} sq ft × {(1+plasterCalc.waste/100).toFixed(2)} waste factor ÷ {plasterCalc.coverage} sq ft/bag = {plasterCalc.bagsNeeded} bags
            </div>
            {!plasterCalc.hasCost && (
              <div style={{marginTop:8,fontSize:11,color:"#f59e0b"}}>Enter a cost per bag above to calculate total material cost - it'll automatically feed into the Cost Estimator and Quote Builder's Interior Finish line item.</div>
            )}
          </div>
        </>}

        {tab===5&&<CostEstimator shape={shape} len={len} wid={wid} depthId={depthId} finishId={finishId} colorId={colorId} entries={entries} hardscapes={hardscapes} extras={extras} localRates={localRates} setLocalRates={setLocalRates} projectName={projectName} clientName={clientName} materials={materials} plasterConfig={plasterConfig} financingLinks={financingLinks} />}

        {tab===6&&<>
          <div style={card}>
            <div style={sectionTitle}>Equipment Brand</div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {EQUIPMENT_BRANDS.map(b=>(
                <button key={b.id} onClick={()=>{ setEquipmentBrand(b.id); try{localStorage.setItem("pc_equip_brand",b.id);}catch{} }}
                  style={{flex:1,padding:"10px 0",borderRadius:10,border:`2px solid ${equipmentBrand===b.id?"#06b6d4":"#334155"}`,background:equipmentBrand===b.id?"rgba(6,182,212,0.1)":"#1e293b",color:equipmentBrand===b.id?"#06b6d4":"#94a3b8",cursor:"pointer",fontSize:13,fontWeight:700}}>
                  {b.label}
                </button>
              ))}
            </div>
            <div style={sectionTitle}>Equipment Options</div>
            {[{label:"🔥 Include Heater",key:"heater"},{label:"💧 Water Features",key:"waterFeature"}].map(o=>(
              <div key={o.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <span style={{fontSize:14}}>{o.label}</span>
                <button onClick={()=>setExtras(p=>({...p,[o.key]:!p[o.key]}))} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",background:extras[o.key]?"#06b6d4":"#334155",position:"relative",transition:"background 0.2s",flexShrink:0}}><span style={{position:"absolute",top:3,left:extras[o.key]?22:3,width:18,height:18,borderRadius:"50%",background:"white",transition:"left 0.2s"}}/></button>
              </div>
            ))}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:14}}>🧂 Sanitization</span>
              <div style={{display:"flex",gap:6}}>{["salt","chlorine"].map(sv=>(<button key={sv} onClick={()=>setExtras(p=>({...p,sanitization:sv}))} style={{padding:"5px 12px",borderRadius:8,border:`2px solid ${extras.sanitization===sv?"#06b6d4":"#334155"}`,background:extras.sanitization===sv?"rgba(6,182,212,0.1)":"#1e293b",color:extras.sanitization===sv?"#06b6d4":"#94a3b8",cursor:"pointer",fontSize:12,fontWeight:700,textTransform:"capitalize"}}>{sv}</button>))}</div>
            </div>
          </div>
          <div style={{background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.25)",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#06b6d4",fontWeight:600}}>Equipment sized for {materials.gallons.toLocaleString()} gallon pool</div>
          {equipment.map(eq=>(
            <div key={eq.label} style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,overflow:"hidden"}}>
              <div style={{padding:"14px 16px 10px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>{eq.label}</div><div style={{fontWeight:700,fontSize:14,color:"#e2e8f0",lineHeight:1.3}}>{eq.model}</div></div>
                  <div style={{background:"#1e293b",borderRadius:8,padding:"3px 10px",fontSize:10,color:"#94a3b8",fontFamily:"monospace",flexShrink:0,marginLeft:10}}>SKU: {eq.sku}</div>
                </div>
                <div style={{fontSize:12,color:"#64748b",lineHeight:1.5}}>{eq.note}{eq.qtyNote && <span style={{color:"#f59e0b",fontWeight:700}}> - {eq.qtyNote}</span>}</div>
              </div>
              {(eq.asin || eq.query) && (<a href={equipBuyLink(eq.asin, eq.query)} target="_blank" rel="noopener noreferrer" style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", background:"linear-gradient(135deg,rgba(255,153,0,0.15),rgba(255,120,0,0.08))", borderTop:"1px solid rgba(255,153,0,0.2)", textDecoration:"none", gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>📦</span><div><div style={{fontSize:12,fontWeight:700,color:"#ff9900"}}>Buy on Amazon</div><div style={{fontSize:10,color:"#64748b"}}>You earn {eq.earn} affiliate commission</div></div></div>
                <span style={{color:"#ff9900",fontSize:16}}>→</span>
              </a>)}
            </div>
          ))}
          <div style={{background:"rgba(255,153,0,0.06)",border:"1px solid rgba(255,153,0,0.2)",borderRadius:12,padding:12,textAlign:"center"}}>
            <div style={{fontSize:12,color:"#ff9900",fontWeight:700,marginBottom:3}}>💰 Earn 3-8% on every {EQUIPMENT_BRANDS.find(b=>b.id===equipmentBrand)?.label} purchase</div>
            <div style={{fontSize:11,color:"#64748b"}}>All equipment links are pre-tagged with your Amazon affiliate ID.</div>
          </div>
        </>}

        {tab===12&&<SchematicTab poolLen={len} poolWid={wid} poolShape={shape} depthId={depthId} />}

        {tab===7&&<>
          <div style={card}>
            <div style={sectionTitle}>Guide Mode</div>
            <div style={{display:"flex",gap:8}}>{[{id:"contractor",label:"👷 Contractor"},{id:"diy",label:"🏠 Homeowner DIY"}].map(m=>(<button key={m.id} onClick={()=>setGuideMode(m.id)} style={{flex:1,padding:"10px 0",borderRadius:10,border:`2px solid ${guideMode===m.id?"#06b6d4":"#334155"}`,background:guideMode===m.id?"rgba(6,182,212,0.1)":"#1e293b",color:guideMode===m.id?"#06b6d4":"#94a3b8",cursor:"pointer",fontSize:13,fontWeight:700}}>{m.label}</button>))}</div>
            {guideMode==="diy"&&<div style={{marginTop:12,padding:"10px 12px",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:10,fontSize:12,color:"#f59e0b"}}>⚠️ DIY pool building requires permits in all US states. Structural concrete & electrical must pass inspection.</div>}
          </div>
          {STEP_GUIDE.map((phase,i)=>(
            <div key={i} style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,overflow:"hidden"}}>
              <div style={{background:"linear-gradient(135deg,rgba(6,182,212,0.15),rgba(2,132,199,0.08))",padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,borderRadius:10,background:"rgba(6,182,212,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{phase.icon}</div>
                <div style={{flex:1}}><div style={{fontSize:10,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>{phase.phase}</div><div style={{fontWeight:700,fontSize:15,color:"#e2e8f0"}}>{phase.title}</div></div>
                <div style={{fontSize:11,color:"#64748b",background:"#1e293b",padding:"3px 10px",borderRadius:20}}>⏱ {phase.days}</div>
              </div>
              <div style={{padding:"12px 16px"}}>{phase.steps.map((step,j)=>(<div key={j} style={{display:"flex",gap:10,marginBottom:9}}><span style={{minWidth:20,height:20,borderRadius:"50%",background:"rgba(6,182,212,0.15)",color:"#06b6d4",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{j+1}</span><span style={{fontSize:13,color:"#94a3b8",lineHeight:1.5}}>{step}</span></div>))}</div>
            </div>
          ))}
        </>}

        {tab===8&&<>
          <div style={{background:"linear-gradient(135deg,rgba(245,158,11,0.18),rgba(217,119,6,0.1))",border:"1px solid rgba(245,158,11,0.35)",borderRadius:16,padding:16}}>
            <div style={{fontSize:14,fontWeight:800,color:"#f59e0b"}}>💰 Affiliate Shopping - You Earn on Every Purchase</div>
            <div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>All links are pre-tagged with your affiliate ID. Replace placeholders with your real IDs before launch.</div>
          </div>
          <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>{SHOP_CATEGORIES.map(cat=>(<button key={cat.id} onClick={()=>setShopCat(cat.id)} style={{whiteSpace:"nowrap",padding:"10px 16px",minHeight:40,borderRadius:20,border:`2px solid ${shopCat===cat.id?"#06b6d4":"#334155"}`,background:shopCat===cat.id?"rgba(6,182,212,0.1)":"#111827",color:shopCat===cat.id?"#06b6d4":"#94a3b8",cursor:"pointer",fontSize:12,fontWeight:600}}>{cat.icon} {cat.label}</button>))}</div>
          {activeCat?.products.map(product=>{
            const rc=RETAILER_COLORS[product.retailer]||{bg:"rgba(100,116,139,0.1)",border:"rgba(100,116,139,0.3)",text:"#94a3b8"};
            const saved=wishlist.includes(product.name);
            return(
              <div key={product.name} style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:16}}>
                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{width:50,height:50,borderRadius:10,background:"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{product.img}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}><div style={{fontSize:14,fontWeight:600,color:"#e2e8f0",lineHeight:1.3}}>{product.name}</div><button onClick={()=>toggleWishlist(product.name)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,flexShrink:0,padding:10,margin:-10,minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}>{saved?"❤️":"🤍"}</button></div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}><span style={{padding:"2px 9px",borderRadius:20,background:rc.bg,border:`1px solid ${rc.border}`,color:rc.text,fontSize:11,fontWeight:700}}>{product.retailer}</span><span style={{padding:"2px 9px",borderRadius:20,background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.2)",color:"#06b6d4",fontSize:11,fontWeight:600}}>{product.badge}</span><span style={{fontSize:11,color:"#64748b"}}>Earn: {product.earn}</span></div>
                  </div>
                </div>
                <a href={product.link} target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:12,padding:"10px",borderRadius:10,background:"linear-gradient(135deg,rgba(6,182,212,0.18),rgba(2,132,199,0.12))",border:"1px solid rgba(6,182,212,0.3)",color:"#06b6d4",textDecoration:"none",fontSize:13,fontWeight:700,textAlign:"center"}}>Shop on {product.retailer} →</a>
              </div>
            );
          })}
          {wishlist.length>0&&(
            <div style={{background:"#111827",border:"1px solid rgba(245,158,11,0.3)",borderRadius:14,padding:16}}>
              <div style={{fontSize:13,fontWeight:700,color:"#f59e0b",marginBottom:10}}>❤️ Saved Items ({wishlist.length})</div>
              {wishlist.map(item=>(<div key={item} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #1e293b"}}><span style={{fontSize:13,color:"#94a3b8"}}>{item}</span><button onClick={()=>toggleWishlist(item)} style={{background:"none",border:"none",cursor:"pointer",color:"#64748b",fontSize:12,padding:"8px 4px",minHeight:36}}>Remove</button></div>))}
            </div>
          )}
        </>}

        {tab===9&&<QuickRender len={len} wid={wid} shape={shape} finishId={finishId} colorId={colorId} entries={entries} hardscapes={hardscapes} dailyRenders={dailyRenders} dailyLimit={DAILY_RENDER_LIMIT} bumpDailyRender={bumpDailyRender} />}
        {tab===10&&<BuildTracker projectName={projectName} clientName={clientName} clientEmail={clientEmail} clientPhone={clientPhone} reviewLinks={reviewLinks} />}
        {tab===11&&<SettingsScreen userMode={userMode} setUserMode={setUserMode} plan={plan} ownPlan={ownPlan} seats={seats} teamMembership={teamMembership} user={user} financingLinks={financingLinks} setFinancingLinks={setFinancingLinks} reviewLinks={reviewLinks} setReviewLinks={setReviewLinks} />}
      </div>

      {/* Quote Builder + Timeline slide up from Cost Estimator tab */}
      {tab===5&&<div style={{padding:"0 14px 14px",maxWidth:820,margin:"0 auto",display:"flex",flexDirection:"column",gap:14}}>
        <QuoteBuilder shape={shape} len={len} wid={wid} depthId={depthId} finishId={finishId} entries={entries} hardscapes={hardscapes} extras={extras} localRates={localRates} projectName={projectName} clientName={clientName} plasterConfig={plasterConfig} financingLinks={financingLinks} />
        <BuildTimeline shape={shape} len={len} wid={wid} depthId={depthId} entries={entries} hardscapes={hardscapes} />
      </div>}
    </div>
  );
}
 