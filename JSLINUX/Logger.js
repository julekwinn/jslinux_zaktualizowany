class PreciseLogger {
    constructor() {
        this.logs = [];
        this.listeners = new Set();
        this.performance = window.performance;
        this.startTime = this.performance.now();
        this.startDate = new Date();
    }

    getCurrentTimestamp() {
        const elapsed = this.performance.now() - this.startTime;
        const currentDate = new Date(this.startDate.getTime() + elapsed);
        return currentDate;
    }

    formatTimestamp(date) {
        const pad = (num, size = 2) => String(num).padStart(size, '0');
        
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        const milliseconds = pad(date.getMilliseconds(), 3);
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
    }

    log(module, message, level = 'info', tags = []) {
        const timestamp = this.getCurrentTimestamp();
        const logEntry = {
            id: crypto.randomUUID(),
            timestamp,
            timestampFormatted: this.formatTimestamp(timestamp),
            module,
            message,
            level,
            tags,
            performanceTimestamp: this.performance.now()
        };

        this.logs.push(logEntry);
        this.notifyListeners(logEntry);
        return logEntry.id;
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    removeListener(callback) {
        return this.listeners.delete(callback);
    }

    notifyListeners(logEntry) {
        this.listeners.forEach(callback => {
            try {
                callback(logEntry);
            } catch (error) {
                console.error('Błąd w listenerze:', error);
            }
        });
    }

    getLogs(options = {}) {
        let filteredLogs = [...this.logs];

        if (options.module) {
            filteredLogs = filteredLogs.filter(log => log.module === options.module);
        }

        if (options.level) {
            filteredLogs = filteredLogs.filter(log => log.level === options.level);
        }

        if (options.tags && options.tags.length > 0) {
            filteredLogs = filteredLogs.filter(log => 
                options.tags.some(tag => log.tags.includes(tag))
            );
        }

        if (options.startTime) {
            filteredLogs = filteredLogs.filter(log => 
                log.timestamp >= options.startTime
            );
        }

        if (options.endTime) {
            filteredLogs = filteredLogs.filter(log => 
                log.timestamp <= options.endTime
            );
        }

        return filteredLogs;
    }

    clearLogs() {
        const clearedLogs = [...this.logs];
        this.logs = [];
        this.notifyListeners({ type: 'clear', clearedLogs });
    }

    exportLogs(format = 'json') {
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(this.logs, null, 2);
            case 'csv':
                const headers = ['timestampFormatted', 'module', 'level', 'message', 'tags'];
                const rows = [headers];
                
                this.logs.forEach(log => {
                    rows.push([
                        log.timestampFormatted,
                        log.module,
                        log.level,
                        log.message,
                        log.tags.join(';')
                    ]);
                });
                
                return rows.map(row => row.join(',')).join('\n');
            default:
                throw new Error(`Nieobsługiwany format eksportu: ${format}`);
        }
    }
}

class LoggerUI {
    constructor(logger) {
        this.logger = logger;
        this.autoScroll = true;
        this.minimized = false;
        this.container = document.getElementById('logger');
        this.content = document.getElementById('loggerContent');
        this.filterInput = document.getElementById('logFilter');
        this.moduleSelect = document.getElementById('moduleFilter');
        this.clearButton = document.getElementById('clearLogs');
        this.autoScrollButton = document.getElementById('toggleAutoScroll');
        this.toggleButton = document.getElementById('toggleLogger');
        this.exportButton = document.getElementById('exportLogs');
        
        this.setupEventListeners();
        this.uniqueModules = new Set();
    }

    setupEventListeners() {
        this.logger.addListener(this.handleNewLog.bind(this));
        this.filterInput.addEventListener('input', this.filterLogs.bind(this));
        this.moduleSelect.addEventListener('change', this.filterLogs.bind(this));

        this.clearButton.addEventListener('click', () => {
            this.logger.clearLogs();
            this.content.innerHTML = '';
            this.uniqueModules.clear();
            this.updateModuleSelect();
        });

        this.autoScrollButton.addEventListener('click', () => {
            this.autoScroll = !this.autoScroll;
            this.autoScrollButton.textContent = `Auto scroll: ${this.autoScroll ? 'ON' : 'OFF'}`;
        });

        this.toggleButton.addEventListener('click', () => {
            this.minimized = !this.minimized;
            this.container.style.height = this.minimized ? '40px' : '300px';
            this.toggleButton.textContent = this.minimized ? '□' : '_';
        });

        this.exportButton.addEventListener('click', () => {
            const format = 'json'; // Można dodać wybór formatu
            const content = this.logger.exportLogs(format);
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `logs-${new Date().toISOString()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    handleNewLog(logEntry) {
        if (!logEntry || logEntry.type === 'clear') return;

        if (!this.uniqueModules.has(logEntry.module)) {
            this.uniqueModules.add(logEntry.module);
            this.updateModuleSelect();
        }

        const logElement = this.createLogElement(logEntry);
        this.content.appendChild(logElement);
        this.filterLogs();

        if (this.autoScroll) {
            this.content.scrollTop = this.content.scrollHeight;
        }
    }

    createLogElement(logEntry) {
        const div = document.createElement('div');
        div.className = `log-entry log-level-${logEntry.level}`;
        div.dataset.module = logEntry.module;
        div.dataset.level = logEntry.level;
        
        const timestamp = document.createElement('span');
        timestamp.className = 'log-timestamp';
        timestamp.textContent = logEntry.timestampFormatted;
        
        const module = document.createElement('span');
        module.className = 'log-module';
        module.textContent = logEntry.module;
        
        const message = document.createElement('span');
        message.className = 'log-message';
        message.textContent = logEntry.message;
        
        div.appendChild(timestamp);
        div.appendChild(module);
        div.appendChild(message);
        
        return div;
    }

    updateModuleSelect() {
        const currentValue = this.moduleSelect.value;
        this.moduleSelect.innerHTML = '<option value="">Wszystkie moduły</option>';
        Array.from(this.uniqueModules).sort().forEach(module => {
            const option = document.createElement('option');
            option.value = module;
            option.textContent = module;
            this.moduleSelect.appendChild(option);
        });
        this.moduleSelect.value = currentValue;
    }

    filterLogs() {
        const filterText = this.filterInput.value.toLowerCase();
        const moduleFilter = this.moduleSelect.value;
        
        Array.from(this.content.children).forEach(logElement => {
            const messageText = logElement.textContent.toLowerCase();
            const moduleMatch = !moduleFilter || logElement.dataset.module === moduleFilter;
            const textMatch = !filterText || messageText.includes(filterText);
            
            logElement.style.display = moduleMatch && textMatch ? 'block' : 'none';
            
            if (filterText && textMatch) {
                logElement.classList.add('highlight');
            } else {
                logElement.classList.remove('highlight');
            }
        });
    }
}

// Inicjalizacja systemu logowania
function initializePreciseLogger() {
    const logger = new PreciseLogger();
    window.preciseLogger = logger;
    
    const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info,
        debug: console.debug
    };

    function createLoggerMethod(originalMethod, level) {
        return function(...args) {
            const message = args.join(' ');
            const moduleMatch = message.match(/^\[(.*?)\]/);
            const module = moduleMatch ? moduleMatch[1] : 'general';
            
            logger.log(module, message, level);
            originalMethod.apply(console, args);
        };
    }

    console.log = createLoggerMethod(originalConsole.log, 'info');
    console.warn = createLoggerMethod(originalConsole.warn, 'warn');
    console.error = createLoggerMethod(originalConsole.error, 'error');
    console.info = createLoggerMethod(originalConsole.info, 'info');
    console.debug = createLoggerMethod(originalConsole.debug, 'debug');

    return new LoggerUI(logger);
}

// Automatyczna inicjalizacja
document.addEventListener('DOMContentLoaded', initializePreciseLogger);