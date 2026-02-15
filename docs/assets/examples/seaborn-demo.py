import matplotlib
matplotlib.use("agg")
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd

tips = pd.DataFrame({
    "total_bill": [16.99, 10.34, 21.01, 23.68, 24.59, 25.29, 8.77, 26.88, 15.04, 14.78,
                   10.27, 35.26, 15.42, 18.43, 14.83, 21.58, 10.33, 16.29, 16.97, 20.65],
    "day": ["Sun", "Sun", "Sun", "Sun", "Sun", "Sat", "Sat", "Sat", "Sat", "Sat",
            "Thur", "Thur", "Thur", "Thur", "Thur", "Fri", "Fri", "Fri", "Fri", "Fri"],
    "sex": ["Female", "Male", "Male", "Male", "Female", "Male", "Male", "Male", "Female", "Female",
            "Female", "Male", "Male", "Female", "Female", "Male", "Female", "Male", "Female", "Male"],
})
tips["day"] = pd.Categorical(tips["day"], categories=["Thur", "Fri", "Sat", "Sun"], ordered=True)

fig, ax = plt.subplots(figsize=(5, 4))
sns.violinplot(data=tips, x="day", y="total_bill", hue="sex", split=True, ax=ax, palette="Set2")
ax.set_title("Total Bill by Day and Gender")
ax.legend(title="Gender", loc="upper left")
plt.tight_layout()
fig
