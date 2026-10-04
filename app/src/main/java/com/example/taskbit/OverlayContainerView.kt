package com.example.taskbit

import android.content.Context
import android.util.AttributeSet
import android.widget.FrameLayout

class OverlayContainerView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {

    var onWindowFocusLostListener: (() -> Unit)? = null

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (!hasFocus) {
            onWindowFocusLostListener?.invoke()
        }
    }
}
