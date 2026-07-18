package cz.kuryr4you.driver.watch

import android.content.Context
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.compose.animation.core.Animatable
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

private fun vibrate(context: Context) {
    try {
        context.getSystemService(Vibrator::class.java)
            ?.vibrate(VibrationEffect.createOneShot(40, VibrationEffect.DEFAULT_AMPLITUDE))
    } catch (_: Exception) {
    }
}

/**
 * Posuvník „přejeď pro potvrzení" — akci nejde spustit omylem klepnutím.
 * Puštění před 85 % dráhy posuvník pružně vrátí; dotažení zavibruje a
 * zavolá onConfirm.
 */
@Composable
fun SlideToConfirm(
    label: String,
    color: Color,
    enabled: Boolean = true,
    onConfirm: () -> Unit,
) {
    val context = LocalContext.current
    val density = LocalDensity.current
    val scope = rememberCoroutineScope()
    val offsetX = remember { Animatable(0f) }

    val trackHeight = 42.dp
    val thumbSize = 34.dp
    val padding = 4.dp

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxWidth()
            .height(trackHeight)
            .clip(RoundedCornerShape(50))
            .background(Color(0xFF222738)),
    ) {
        val maxOffset = with(density) { (maxWidth - thumbSize - padding * 2).toPx() }
        val thumbPx = with(density) { thumbSize.toPx() }
        val paddingPx = with(density) { padding.toPx() }

        // výplň za palcem
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .width(with(density) { (offsetX.value + thumbPx + paddingPx * 2).toDp() })
                .clip(RoundedCornerShape(50))
                .background(color.copy(alpha = 0.28f)),
        )

        val progress = if (maxOffset > 0f) offsetX.value / maxOffset else 0f
        Text(
            label,
            style = MaterialTheme.typography.caption2,
            color = Color(0xFF8B91A5).copy(alpha = (1f - progress * 1.4f).coerceIn(0f, 1f)),
            modifier = Modifier.align(Alignment.Center).offset(x = 10.dp),
            maxLines = 1,
        )

        Box(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .offset { IntOffset((paddingPx + offsetX.value).roundToInt(), 0) }
                .size(thumbSize)
                .clip(CircleShape)
                .background(if (enabled) color else color.copy(alpha = 0.4f))
                .draggable(
                    enabled = enabled,
                    orientation = Orientation.Horizontal,
                    state = rememberDraggableState { delta ->
                        scope.launch { offsetX.snapTo((offsetX.value + delta).coerceIn(0f, maxOffset)) }
                    },
                    onDragStopped = {
                        if (offsetX.value >= maxOffset * 0.85f) {
                            offsetX.animateTo(maxOffset)
                            vibrate(context)
                            onConfirm()
                            offsetX.snapTo(0f)
                        } else {
                            offsetX.animateTo(0f)
                        }
                    },
                ),
            contentAlignment = Alignment.Center,
        ) {
            Text("→", color = Color(0xFF0C0E15), style = MaterialTheme.typography.button)
        }
    }
}
