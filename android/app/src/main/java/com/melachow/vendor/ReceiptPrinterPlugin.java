package com.melachow.vendor;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ReceiptPrinter")
public class ReceiptPrinterPlugin extends Plugin {
    @PluginMethod
    public void print(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
            WebView webView = getBridge().getWebView();
            if (manager == null || webView == null) {
                call.reject("Android printing is unavailable on this device.");
                return;
            }
            String name = call.getString("name", "MelaChow order receipt");
            try {
                PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(name);
                manager.print(name, adapter, new PrintAttributes.Builder().build());
                call.resolve(new JSObject());
            } catch (Exception error) {
                call.reject("Could not open the Android print dialog.", error);
            }
        });
    }
}
