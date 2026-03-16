# ModSim101 📊
> An interactive educational web application for exploring probability distributions, random sampling, linear modeling, and statistical matching.

## Overview
ModSim101 is a dynamic learning tool built for students to intuitively grasp statistical concepts through real-time visualizations and simulations. Designed to mirror capabilities normally requiring extensive R or Python programming experience, the tool provides a graphical interface bridging the gap between mathematical theory and code application. 

Every module includes:
- **Interactive Visualizations**: Powered by Chart.js, allowing students to drag sliders and visualize changing densities and scatter plots instantly.
- **Equivalent Code Panels**: Side-by-side R and Python snippets to bridge the UI behavior to syntax they can use in real analysis (e.g. using `scipy.stats` in Python or `fitdistrplus` in R).

## Features
### Module 1: Simulation in R / Python
- **Lesson 01 - Random Sampling**: Simulates drawing pseudo-random numbers, letter sampling, and coin-flipping with adjustable biases to map theoretical probabilities to empirical frequencies.
- **Lesson 02 - Distributions Explorer**: Real-time histograms for Normal, Beta, Log-Normal, Exponential, Poisson, Chi², and Triangular distributions. Watch the probability density functionally adapt to slider manipulation of params like Mean, Variance, Rate, Lambda, etc.
- **Lesson 03 - Linear Model Simulator**: Adds stochastic noise (epsilon) onto deterministic OLS linear relationships to showcase how error variance impacts our ability to recover "true" equations from sampled points.

### Module 2: Statistical Fitting
- **Distribution Fitting Tool**: A practical implementation inspired by R's `fitdist` function. Paste datasets or generate synthetic ones—the app calculates Maximum Likelihood Estimates (MLE) across multiple theoretical families (Normal, Lognormal, Exponential, Weibull, Gamma, Logistic, Triangular) and maps their Log-Likelihood to find the "best fit" distribution.

## Tech Stack
- React
- Vite
- modern, responsive vanilla CSS
- Chart.js (for data visualizations and histograms)

## Installation
Ensure you have [Node.js](https://nodejs.org/) installed on your machine.
1. Clone the repository and navigate to the project directory

2. Install the necessary dependencies:
   ```bash
   npm install
   ```

## Running the App
Start the Vite development server to test locally:
```bash
npm run dev
```

The application will be accessible at `http://localhost:5173/`. 

## Building for Production
To bundle and optimize the application into static files for a production environment:
```bash
npm run build
```
The compiled files will be output into the `/dist` directory.
