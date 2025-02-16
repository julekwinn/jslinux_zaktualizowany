mergeInto(LibraryManager.library, {
    file_buffer_get_new_handle: function() {
        console.log('[file_buffer_get_new_handle] Inicjalizacja nowego handlera');
        if (typeof Browser.fbuf_table == "undefined") {
            console.log('[file_buffer_get_new_handle] Tworzenie nowej tabeli buforów');
            Browser.fbuf_table = new Object();
            Browser.fbuf_next_handle = 1;
        }
        
        for(;;) {
            var h = Browser.fbuf_next_handle;
            Browser.fbuf_next_handle++;
            console.log(`[file_buffer_get_new_handle] Próba przypisania handlera: ${h}`);
            if (Browser.fbuf_next_handle == 0x80000000)
                Browser.fbuf_next_handle = 1;
            if (typeof Browser.fbuf_table[h] == "undefined") {
                console.log(`[file_buffer_get_new_handle] Zwracam nowy handler: ${h}`);
                return h;
            }
        }
    },

    file_buffer_init: function(bs) {
        console.log('[file_buffer_init] Inicjalizacja bufora');
        HEAPU32[bs >> 2] = 0;
        HEAPU32[(bs + 4) >> 2] = 0;
    },

    file_buffer_resize: function(bs, new_size) {
        console.log(`[file_buffer_resize] Zmiana rozmiaru bufora na: ${new_size}`);
        var h = HEAPU32[bs >> 2];
        var size = HEAPU32[(bs + 4) >> 2];
        console.log(`[file_buffer_resize] Aktualny handler: ${h}, aktualny rozmiar: ${size}`);
        
        if (new_size == 0) {
            if (h != 0) {
                console.log('[file_buffer_resize] Usuwanie bufora');
                delete Browser.fbuf_table[h];
                h = 0;
            }
        } else if (size == 0) {
            h = Module._file_buffer_get_new_handle();
            console.log(`[file_buffer_resize] Tworzenie nowego bufora z handlerem: ${h}`);
            Browser.fbuf_table[h] = new Uint8Array(new_size);
        } else if (size != new_size) {
            console.log('[file_buffer_resize] Zmiana rozmiaru istniejącego bufora');
            var data = Browser.fbuf_table[h];
            var new_data = new Uint8Array(new_size);
            if (new_size > size) {
                console.log('[file_buffer_resize] Powiększanie bufora');
                new_data.set(data, 0);
            } else {
                console.log('[file_buffer_resize] Zmniejszanie bufora');
                for(var i = 0; i < new_size; i = (i + 1) | 0)
                    new_data[i] = data[i];
            }
            Browser.fbuf_table[h] = new_data;
        }
        
        HEAPU32[bs >> 2] = h;
        HEAPU32[(bs + 4) >> 2] = new_size;
        return 0;
    },
    
    file_buffer_reset: function(bs) {
        console.log('[file_buffer_reset] Resetowanie bufora');
        Module._file_buffer_resize(bs, 0);
        Module._file_buffer_init(bs);
    },
    
    file_buffer_write: function(bs, offset, buf, size) {
        console.log(`[file_buffer_write] Zapis do bufora, offset: ${offset}, rozmiar: ${size}`);
        var h = HEAPU32[bs >> 2];
        if (h) {
            var data = Browser.fbuf_table[h];
            for(var i = 0; i < size; i = (i + 1) | 0) {
                data[offset + i] = HEAPU8[buf + i];
            }
            console.log('[file_buffer_write] Zakończono zapis do bufora');
        } else {
            console.log('[file_buffer_write] Błąd: Nieprawidłowy handler');
        }
    },
    
    file_buffer_read: function(bs, offset, buf, size) {
        console.log(`[file_buffer_read] Odczyt z bufora, offset: ${offset}, rozmiar: ${size}`);
        var h = HEAPU32[bs >> 2];
        if (h) {
            var data = Browser.fbuf_table[h];
            for(var i = 0; i < size; i = (i + 1) | 0) {
                HEAPU8[buf + i] = data[offset + i];
            }
            console.log('[file_buffer_read] Zakończono odczyt z bufora');
        } else {
            console.log('[file_buffer_read] Błąd: Nieprawidłowy handler');
        }
    },

    file_buffer_set: function(bs, offset, val, size) {
        console.log(`[file_buffer_set] Ustawianie wartości w buforze, offset: ${offset}, wartość: ${val}, rozmiar: ${size}`);
        var h = HEAPU32[bs >> 2];
        if (h) {
            var data = Browser.fbuf_table[h];
            for(var i = 0; i < size; i = (i + 1) | 0) {
                data[offset + i] = val;
            }
            console.log('[file_buffer_set] Zakończono ustawianie wartości');
        } else {
            console.log('[file_buffer_set] Błąd: Nieprawidłowy handler');
        }
    },

    console_write: function(opaque, buf, len) {
        console.log('[console_write] Zapis do konsoli');
        var str = String.fromCharCode.apply(String, HEAPU8.subarray(buf, buf + len));
        term.write(str);
    },

    console_get_size: function(pw, ph) {
        console.log('[console_get_size] Pobieranie rozmiaru konsoli');
        var r = term.getSize();
        HEAPU32[pw >> 2] = r[0];
        HEAPU32[ph >> 2] = r[1];
        console.log(`[console_get_size] Szerokość: ${r[0]}, Wysokość: ${r[1]}`);
    },

    fs_export_file: function(filename, buf, buf_len) {
        var _filename = UTF8ToString(filename);
        console.log(`[fs_export_file] Eksport pliku: ${_filename}, rozmiar: ${buf_len}`);
        var data = HEAPU8.subarray(buf, buf + buf_len);
        var file = new Blob([data], { type: "application/octet-stream" });
        var url = URL.createObjectURL(file);
        var a = document.createElement("a");
        a.href = url;
        a.setAttribute("download", _filename);
        a.innerHTML = "downloading";
        document.body.appendChild(a);
        console.log('[fs_export_file] Rozpoczęcie pobierania pliku');
        setTimeout(function() {
            a.click();
            document.body.removeChild(a);
            console.log('[fs_export_file] Plik pobrany');
        }, 50);
    },

    emscripten_async_wget3_data: function(url, request, user, password, post_data, post_data_len, arg, free, onload, onerror, onprogress) {
        var _url = UTF8ToString(url);
        var _request = UTF8ToString(request);
        console.log(`[wget3_data] Rozpoczęcie żądania ${_request} do: ${_url}`);
        
        var _user = user ? UTF8ToString(user) : null;
        var _password = password ? UTF8ToString(password) : null;
        var http = new XMLHttpRequest();
        
        http.open(_request, _url, true);
        http.responseType = 'arraybuffer';
        
        if (_user) {
            console.log('[wget3_data] Dodawanie autoryzacji');
            http.setRequestHeader("Authorization", "Basic " + btoa(_user + ':' + _password));
        }
        
        var handle = Browser.getNextWgetRequestHandle();
        console.log(`[wget3_data] Utworzono nowy handler żądania: ${handle}`);

        http.onload = function http_onload(e) {
            console.log(`[wget3_data] Odpowiedź otrzymana, status: ${http.status}`);
            if (http.status == 200 || _url.substr(0,4).toLowerCase() != "http") {
                var byteArray = new Uint8Array(http.response);
                var buffer = _malloc(byteArray.length);
                HEAPU8.set(byteArray, buffer);
                if (onload) {
                    console.log('[wget3_data] Wywołanie callback onload');
                    wasmTable.get(onload)(handle, arg, buffer, byteArray.length);
                }
                if (free) _free(buffer);
            } else {
                console.log(`[wget3_data] Błąd HTTP: ${http.status}`);
                if (onerror) {
                    wasmTable.get(onerror)(handle, arg, http.status, http.statusText);
                }
            }
            delete Browser.wgetRequests[handle];
        };

        http.onerror = function http_onerror(e) {
            console.log('[wget3_data] Wystąpił błąd podczas żądania');
            if (onerror) {
                wasmTable.get(onerror)(handle, arg, http.status, http.statusText);
            }
            delete Browser.wgetRequests[handle];
        };

        http.onprogress = function http_onprogress(e) {
            console.log(`[wget3_data] Postęp: ${e.loaded}/${e.total}`);
            if (onprogress) {
                wasmTable.get(onprogress)(handle, arg, e.loaded, 
                    e.lengthComputable || e.lengthComputable === undefined ? e.total : 0);
            }
        };

        http.onabort = function http_onabort(e) {
            console.log('[wget3_data] Żądanie przerwane');
            delete Browser.wgetRequests[handle];
        };

        if (_request == "POST") {
            console.log('[wget3_data] Wysyłanie danych POST');
            var _post_data = HEAPU8.subarray(post_data, post_data + post_data_len);
            http.setRequestHeader("Content-type", "application/octet-stream");
            http.setRequestHeader("Content-length", post_data_len);
            http.setRequestHeader("Connection", "close");
            http.send(_post_data);
        } else {
            http.send(null);
        }

        Browser.wgetRequests[handle] = http;
        return handle;
    },

    fs_wget_update_downloading: function(flag) {
        console.log(`[fs_wget_update_downloading] Aktualizacja stanu pobierania: ${flag}`);
        update_downloading(Boolean(flag));
    },
    
    fb_refresh: function(opaque, data, x, y, w, h, stride) {
        console.log(`[fb_refresh] Odświeżanie framebuffera: x=${x}, y=${y}, w=${w}, h=${h}`);
        var display = graphic_display;
        var image_data = display.image.data;
        var image_stride = display.width * 4;
        var dst_pos1 = (y * display.width + x) * 4;
        
        for(var i = 0; i < h; i = (i + 1) | 0) {
            var src = data;
            var dst_pos = dst_pos1;
            for(var j = 0; j < w; j = (j + 1) | 0) {
                var v = HEAPU32[src >> 2];
                image_data[dst_pos] = (v >> 16) & 0xff;
                image_data[dst_pos + 1] = (v >> 8) & 0xff;
                image_data[dst_pos + 2] = v & 0xff;
                image_data[dst_pos + 3] = 0xff;
                src = (src + 4) | 0;
                dst_pos = (dst_pos + 4) | 0;
            }
            data = (data + stride) | 0;
            dst_pos1 = (dst_pos1 + image_stride) | 0;
        }
        display.ctx.putImageData(display.image, 0, 0, x, y, w, h);
        console.log('[fb_refresh] Zakończono odświeżanie framebuffera');
    },

    net_recv_packet: function(bs, buf, buf_len) {
        console.log(`[net_recv_packet] Odebrano pakiet o rozmiarze: ${buf_len}`);
        if (net_state) {
            net_state.recv_packet(HEAPU8.subarray(buf, buf + buf_len));
            console.log('[net_recv_packet] Pakiet został przetworzony');
        } else {
            console.log('[net_recv_packet] Błąd: net_state nie jest zainicjalizowany');
        }
    },
});