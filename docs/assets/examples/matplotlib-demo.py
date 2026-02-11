import matplotlib
matplotlib.use("agg")
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 4 * np.pi, 300)
fig, axes = plt.subplots(2, 2, figsize=(10, 6))

axes[0, 0].plot(x, np.sin(x), color="#3b82f6")
axes[0, 0].set_title("sin(x)")
axes[0, 0].grid(True, alpha=0.3)

axes[0, 1].plot(x, np.cos(x), color="#ef4444")
axes[0, 1].set_title("cos(x)")
axes[0, 1].grid(True, alpha=0.3)

axes[1, 0].plot(x, np.sin(x) * np.exp(-x / 10), color="#22c55e")
axes[1, 0].set_title("Damped sine")
axes[1, 0].grid(True, alpha=0.3)

fft_vals = np.abs(np.fft.fft(np.sin(x)))[:len(x)//2]
freqs = np.fft.fftfreq(len(x), d=(x[1] - x[0]))[:len(x)//2]
axes[1, 1].plot(freqs, fft_vals, color="#a855f7")
axes[1, 1].set_title("FFT magnitude")
axes[1, 1].set_xlabel("Frequency")
axes[1, 1].grid(True, alpha=0.3)

fig.suptitle("Signal Analysis", fontsize=14, fontweight="bold")
fig.tight_layout()
fig
