const SKIN_IDS = [
  "skin-smiley",
  "skin-floppy-o",
  "skin-monitor-max",
  "skin-forbino-max",
  "skin-calc-a-tron",
  "skin-action",
  "skin-mug",
];

const accessoriesSection = document.getElementById("accessories-section");
const statusBadge = document.getElementById("status-badge");

const accessoryToggles = {
  glasses: document.getElementById("toggle-glasses"),
  hat: document.getElementById("toggle-hat"),
  mustache: document.getElementById("toggle-mustache"),
};

const skinRadios = {
  smiley: document.getElementById("skin-radio-smiley"),
  "floppy-o": document.getElementById("skin-radio-floppy-o"),
  "monitor-max": document.getElementById("skin-radio-monitor-max"),
  "forbino-max": document.getElementById("skin-radio-forbino-max"),
  "calc-a-tron": document.getElementById("skin-radio-calc-a-tron"),
  action: document.getElementById("skin-radio-action"),
  mug: document.getElementById("skin-radio-mug"),
};

function applyToPreview(appearance) {
  for (const skinId of SKIN_IDS) {
    document.getElementById(skinId).classList.toggle("active", skinId === `skin-${appearance.skin}`);
  }
  for (const [skin, radio] of Object.entries(skinRadios)) {
    radio.checked = appearance.skin === skin;
  }
  for (const key of Object.keys(accessoryToggles)) {
    const el = document.getElementById(`acc-${key}`);
    el.classList.toggle("visible", Boolean(appearance[key]));
    accessoryToggles[key].checked = Boolean(appearance[key]);
  }

  // Los accesorios (lentes/gorra/bigote) están dibujados sobre el skin
  // Smiley nomás — con cualquier otro skin elegido, ni pintan ni tiene
  // sentido mostrar los controles. Se pisa el estilo inline en vez de usar
  // el atributo `hidden`: `.options{display:flex}` en customize.css le
  // gana en cascada al `display:none` implícito de `[hidden]`.
  accessoriesSection.style.display = appearance.skin === "smiley" ? "" : "none";

  statusBadge.classList.toggle("visible", appearance.skin !== "smiley");
}

window.usagePet.getAppearance().then(applyToPreview);
window.usagePet.onAppearanceUpdated(applyToPreview);

for (const [skin, radio] of Object.entries(skinRadios)) {
  radio.addEventListener("change", () => {
    if (radio.checked) window.usagePet.setAppearance({ skin });
  });
}

for (const [key, input] of Object.entries(accessoryToggles)) {
  input.addEventListener("change", () => {
    window.usagePet.setAppearance({ [key]: input.checked });
  });
}
