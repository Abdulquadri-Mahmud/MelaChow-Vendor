package com.melachow.vendor;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().getDecorView().setBackgroundColor(Color.WHITE);

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
            getWindow(), getWindow().getDecorView()
        );
        controller.setAppearanceLightStatusBars(true);
        controller.setAppearanceLightNavigationBars(true);

        View content = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            int insetTypes = WindowInsetsCompat.Type.systemBars()
                | WindowInsetsCompat.Type.displayCutout();
            Insets insets = windowInsets.getInsets(insetTypes);
            view.setPadding(insets.left, insets.top, insets.right, insets.bottom);

            return new WindowInsetsCompat.Builder(windowInsets)
                .setInsets(insetTypes, Insets.NONE)
                .build();
        });
        ViewCompat.requestApplyInsets(content);
    }
}
