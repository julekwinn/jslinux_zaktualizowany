#!/bin/bash

# Kolory dla lepszej czytelności
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Lista plików do przeniesienia
files=(
    "riscvemu32-wasm.js"
    "riscvemu32-wasm.wasm"
    "riscvemu32.js"
    "riscvemu64-wasm.js"
    "riscvemu64-wasm.wasm"
    "riscvemu64.js"
)

# Funkcja czyszczenia
function clean_build() {
    echo -e "${BLUE}Wykonywanie make clean...${NC}"
    make clean > compile.log 2>&1
    echo -e "${GREEN}Czyszczenie zakończone.${NC}"
}

# Funkcja budowania
function build_project() {
    echo -e "${BLUE}Rozpoczynam proces budowania...${NC}"
    make -f Makefile.js >> compile.log 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Budowanie zakończone sukcesem.${NC}"
    else
        echo -e "${RED}Błąd podczas budowania. Sprawdź compile.log${NC}"
        return 1
    fi
}

# Funkcja przenoszenia plików
function move_files() {
    echo -e "${BLUE}Przenoszenie plików do katalogu JSLINUX...${NC}"
    
    # Najpierw usuń stare pliki
    for file in "${files[@]}"; do
        if [ -f "JSLINUX/$file" ]; then
            rm "JSLINUX/$file"
            echo "Usunięto: JSLINUX/$file"
        fi
    done
    
    # Przenieś nowe pliki
    for file in "${files[@]}"; do
        if [ -f "js/$file" ]; then
            mv "js/$file" "JSLINUX/$file"
            echo "Przeniesiono: js/$file -> JSLINUX/$file"
        else
            echo -e "${RED}Ostrzeżenie: Plik js/$file nie istnieje${NC}"
        fi
    done
    
    echo -e "${GREEN}Przenoszenie plików zakończone.${NC}"
}

# Funkcja uruchamiania serwera
function start_server() {
    if [ ! -d "JSLINUX" ]; then
        echo -e "${RED}Błąd: Katalog JSLINUX nie istnieje!${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Uruchamianie serwera HTTP w katalogu JSLINUX...${NC}"
    if command -v python3 &> /dev/null; then
        echo -e "${GREEN}Serwer dostępny pod adresem: http://localhost:8000${NC}"
        cd JSLINUX && python3 -m http.server 8000
    elif command -v python &> /dev/null; then
        echo -e "${GREEN}Serwer dostępny pod adresem: http://localhost:8000${NC}"
        cd JSLINUX && python -m SimpleHTTPServer 8000
    else
        echo -e "${RED}Błąd: Python nie jest zainstalowany. Nie można uruchomić serwera HTTP.${NC}"
        return 1
    fi
}

# Funkcja pokazująca logi
function show_logs() {
    if [ -f "compile.log" ]; then
        echo -e "${BLUE}Ostatnie logi kompilacji:${NC}"
        cat compile.log
    else
        echo -e "${RED}Plik compile.log nie istnieje.${NC}"
    fi
}

# Funkcja sprawdzająca status plików
function check_files_status() {
    echo -e "${BLUE}Sprawdzanie statusu plików:${NC}"
    echo "Katalog JSLINUX:"
    for file in "${files[@]}"; do
        if [ -f "JSLINUX/$file" ]; then
            echo -e "${GREEN}✓ $file${NC}"
        else
            echo -e "${RED}✗ $file${NC}"
        fi
    done
}

# Główna pętla menu
while true; do
    clear
    echo -e "${BLUE}=== System Budowania JSLINUX ===${NC}"
    echo "1) Wykonaj pełny proces budowania"
    echo "2) Wykonaj tylko make clean"
    echo "3) Przenieś pliki do JSLINUX"
    echo "4) Uruchom serwer HTTP"
    echo "5) Pokaż logi kompilacji"
    echo "6) Sprawdź status plików"
    echo "7) Zakończ"
    echo
    read -p "Wybierz opcję (1-7): " choice

    case $choice in
        1)
            clean_build
            build_project
            move_files
            read -p "Naciśnij Enter, aby kontynuować..."
            ;;
        2)
            clean_build
            read -p "Naciśnij Enter, aby kontynuować..."
            ;;
        3)
            move_files
            read -p "Naciśnij Enter, aby kontynuować..."
            ;;
        4)
            start_server
            ;;
        5)
            show_logs
            read -p "Naciśnij Enter, aby kontynuować..."
            ;;
        6)
            check_files_status
            read -p "Naciśnij Enter, aby kontynuować..."
            ;;
        7)
            echo -e "${GREEN}Do widzenia!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Nieprawidłowa opcja!${NC}"
            read -p "Naciśnij Enter, aby kontynuować..."
            ;;
    esac
done