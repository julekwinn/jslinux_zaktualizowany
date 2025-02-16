#
# TinyEMU emulator
# 
# Copyright (c) 2016-2018 Fabrice Bellard
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
# THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.

EMCC=emcc
EMCFLAGS=-O2 -Wall -D_FILE_OFFSET_BITS=64 -D_LARGEFILE_SOURCE -MMD -fno-strict-aliasing -DCONFIG_FS_NET
#EMCFLAGS+=-Werror

# Zaktualizowane flagi dla nowszej wersji Emscripten
COMMON_EMLDFLAGS=-O3 \
    --closure 0 \
    -s NO_EXIT_RUNTIME=1 \
    -s NO_FILESYSTEM=1 \
    -s EXPORTED_FUNCTIONS='["_malloc","_free","_console_queue_char","_vm_start", \
    "_fs_import_file","_display_key_event","_display_mouse_event", \
    "_display_wheel_event","_net_write_packet","_net_set_carrier", \
    "_file_buffer_get_new_handle","_file_buffer_resize","_file_buffer_init"]' \
    -s EXPORTED_RUNTIME_METHODS='["stringToUTF8","lengthBytesUTF8","ccall","cwrap"]' \
    -s ALLOW_TABLE_GROWTH=1 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s TOTAL_STACK=5242880 \
    --js-library js/lib.js

# Flagi specyficzne dla ASMJS
EMLDFLAGS_ASMJS=$(COMMON_EMLDFLAGS) -s WASM=0

# Flagi specyficzne dla WASM
EMLDFLAGS_WASM=$(COMMON_EMLDFLAGS) \
    -s WASM=1 \
    -s INITIAL_MEMORY=67108864 \
    -s MAXIMUM_MEMORY=268435456

PROGS=js/riscvemu32.js js/riscvemu32-wasm.js js/riscvemu64.js js/riscvemu64-wasm.js

all: $(PROGS)

JS_OBJS=jsemu.js.o softfp.js.o virtio.js.o fs.js.o fs_net.js.o fs_wget.js.o \
    fs_utils.js.o simplefb.js.o pci.js.o json.js.o block_net.js.o \
    iomem.js.o cutils.js.o aes.js.o sha256.js.o

RISCVEMU64_OBJS=$(JS_OBJS) riscv_cpu64.js.o riscv_machine.js.o machine.js.o
RISCVEMU32_OBJS=$(JS_OBJS) riscv_cpu32.js.o riscv_machine.js.o machine.js.o

js/riscvemu64.js: $(RISCVEMU64_OBJS) js/lib.js
	$(EMCC) $(EMLDFLAGS_ASMJS) -o $@ $(RISCVEMU64_OBJS)

js/riscvemu32.js: $(RISCVEMU32_OBJS) js/lib.js
	$(EMCC) $(EMLDFLAGS_ASMJS) -o $@ $(RISCVEMU32_OBJS)

js/riscvemu64-wasm.js: $(RISCVEMU64_OBJS) js/lib.js
	$(EMCC) $(EMLDFLAGS_WASM) -o $@ $(RISCVEMU64_OBJS)

js/riscvemu32-wasm.js: $(RISCVEMU32_OBJS) js/lib.js
	$(EMCC) $(EMLDFLAGS_WASM) -o $@ $(RISCVEMU32_OBJS)

riscv_cpu32.js.o: riscv_cpu.c
	$(EMCC) $(EMCFLAGS) -DMAX_XLEN=32 -DCONFIG_RISCV_MAX_XLEN=32 -c -o $@ $<

riscv_cpu64.js.o: riscv_cpu.c
	$(EMCC) $(EMCFLAGS) -DMAX_XLEN=64 -DCONFIG_RISCV_MAX_XLEN=64 -c -o $@ $<

%.js.o: %.c
	$(EMCC) $(EMCFLAGS) -c -o $@ $<

clean:
	rm -f $(PROGS) *.o *.d

-include $(wildcard *.d)