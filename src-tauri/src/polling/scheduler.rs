use std::time::{Duration, Instant};
use tokio::time::sleep;

/// Calculate the exact deadline for cycle `ciclo` based on absolute start time.
/// deadline = t0 + ciclo * intervalo
/// This prevents drift accumulation across cycles.
pub fn calcular_deadline(t0: Instant, ciclo: u64, intervalo_seg: u64) -> Instant {
    t0 + Duration::from_secs(ciclo * intervalo_seg)
}

/// Sleep until the given deadline. If deadline already passed, returns immediately.
pub async fn sleep_hasta_deadline(deadline: Instant) {
    let ahora = Instant::now();
    if deadline > ahora {
        sleep(deadline - ahora).await;
    }
    // If deadline already passed, we don't sleep (we're running late)
}
