export class MenuManager {
  constructor(audioManager) {
    this.container = null;
    this.currentFocus = 0;
    this.items = [];
    this.onSelect = null;
    this.keyHandler = null;
    this.mouseHandler = null;
    this.buttonHandlers = [];
    this.audioManager = audioManager;
  }

  show(onSelectCallback) {
    console.log("MenuManager.show() llamado");
    
    this.onSelect = onSelectCallback;

    // Evitar listeners duplicados si show() se ejecuta mas de una vez
    this._removeListeners();

    // Mostrar overlay del menú principal
    const menuOverlay = document.getElementById("mainMenuOverlay");
    if (menuOverlay) {
      menuOverlay.classList.add("visible");
      console.log("Menú overlay mostrado");
    } else {
      console.error("No se encontró mainMenuOverlay");
    }
    
    // Asegurar que el menú de configuración esté oculto
    const configMenu = document.getElementById("mainMenu");
    if (configMenu) {
      configMenu.style.display = "none";
      configMenu.classList.remove("visible");
    }

    // Reproducir música de menú
    if (this.audioManager) {
      this.audioManager.startMenuMusic();
    }

    // Elementos interactivos
    this.items = [
      { id: "arcade", label: "Arcade" },
      { id: "timeTrial", label: "Time Trial" },
      { id: "versus", label: "Versus IA" },
      { id: "story", label: "Historia" },
      { id: "options", label: "Opciones" },
    ];

    this.currentFocus = 0;
    this._updateFocus();
    this._setupListeners();
    
    console.log("MenuManager.show() completado");
  }

  hide() {
    console.log("MenuManager.hide() llamado");
    
    const menuOverlay = document.getElementById("mainMenuOverlay");
    if (menuOverlay) {
      menuOverlay.classList.remove("visible");
    }
    
    // Detener música de menú
    if (this.audioManager) {
      this.audioManager.stopMenuMusic();
    }
    
    this._removeListeners();
  }

  _setupListeners() {
    console.log("Configurando listeners del menú");
    this._bindButtonHandlers();
    
    this.keyHandler = (e) => {
      // Verificar que el menú esté visible
      const menuOverlay = document.getElementById("mainMenuOverlay");
      if (!menuOverlay || !menuOverlay.classList.contains("visible")) {
        console.log("Menú no visible, ignorando tecla");
        return;
      }
      
      console.log("Tecla presionada en menú:", e.code);
      
      if (e.code === "ArrowUp") {
        e.preventDefault();
        this.currentFocus = (this.currentFocus - 1 + this.items.length) % this.items.length;
        this._updateFocus();
        console.log("Arriba, focus:", this.currentFocus);
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        this.currentFocus = (this.currentFocus + 1) % this.items.length;
        this._updateFocus();
        console.log("Abajo, focus:", this.currentFocus);
      } else if (e.code === "Enter") {
        e.preventDefault();
        console.log("Enter presionado, seleccionando:", this.items[this.currentFocus]);
        this._selectCurrent();
      }
    };

    this.mouseHandler = (e) => {
      // Verificar que el menú esté visible
      const menuOverlay = document.getElementById("mainMenuOverlay");
      if (!menuOverlay || !menuOverlay.classList.contains("visible")) {
        return;
      }
      
      const buttons = document.querySelectorAll(".main-menu-btn");
      buttons.forEach((btn, idx) => {
        if (btn.contains(e.target)) {
          console.log("Clic en botón:", idx);
          this.currentFocus = idx;
          this._updateFocus();
          this._selectCurrent();
        }
      });
    };

    console.log("Añadiendo listeners al DOM");
    window.addEventListener("keydown", this.keyHandler);
    document.addEventListener("click", this.mouseHandler);
  }

  _bindButtonHandlers() {
    this.buttonHandlers = [];
    const buttons = document.querySelectorAll(".main-menu-btn");

    buttons.forEach((btn, idx) => {
      const handler = (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.currentFocus = idx;
        this._updateFocus();
        this._selectCurrent();
      };

      btn.addEventListener("click", handler);
      this.buttonHandlers.push({ btn, handler });
    });
  }

  _removeListeners() {
    if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler);
    if (this.mouseHandler) document.removeEventListener("click", this.mouseHandler);
    for (const { btn, handler } of this.buttonHandlers) {
      btn.removeEventListener("click", handler);
    }
    this.buttonHandlers = [];
    this.keyHandler = null;
    this.mouseHandler = null;
  }

  _updateFocus() {
    const buttons = document.querySelectorAll(".main-menu-btn");
    buttons.forEach((btn, idx) => {
      if (idx === this.currentFocus) {
        btn.classList.add("focused");
      } else {
        btn.classList.remove("focused");
      }
    });
  }

  _selectCurrent() {
    const item = this.items[this.currentFocus];
    console.log("Seleccionando item:", item);
    
    if (item) {
      if (item.id === "arcade") {
        console.log("Llamando a hide() y callback");
        this.hide();
        
        // Pequeño delay para evitar conflictos
        setTimeout(() => {
          if (this.onSelect) {
            this.onSelect("arcade");
          }
        }, 100);
      } else if (item.id === "options") {
        console.log("Abriendo opciones");
        if (this.onSelect) {
          this.onSelect("options");
        }
      }
    }
  }

  dispose() {
    this._removeListeners();
  }
}
