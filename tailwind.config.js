/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/client/**/*.{js,ts,jsx,tsx}", "./src/client/index.html"],
  theme: {
    extend: {
      colors: {
        "paper-red": "#E63946",
        "crayon-blue": "#457B9D",
        sunshine: "#FFD166",
        grass: "#2A9D8F",
        grape: "#7B2CBF",
        tangerine: "#F77F00",
        kraft: "#C9B99A",
        cork: "#D4A574",
        "lined-paper": "#FFFEF9",
        pencil: "#5C5C5C",
      },
      fontFamily: {
        display: ["Patrick Hand", "cursive"],
        word: ["Andika", "sans-serif"],
        ui: ["Nunito", "sans-serif"],
      },
      boxShadow: {
        paper: "2px 2px 0 rgba(0,0,0,0.1), 4px 4px 0 rgba(0,0,0,0.05)",
        "paper-hover":
          "3px 3px 0 rgba(0,0,0,0.15), 6px 6px 0 rgba(0,0,0,0.08)",
        card: "0 2px 4px rgba(0,0,0,0.1)",
        "card-hover": "0 4px 8px rgba(0,0,0,0.15)",
      },
      animation: {
        "flip-card": "flipCard 0.6s ease-in-out",
        "bounce-in": "bounceIn 0.5s ease-out",
        confetti: "confetti 1s ease-out forwards",
        wiggle: "wiggle 0.3s ease-in-out",
      },
      keyframes: {
        flipCard: {
          "0%": { transform: "rotateY(0deg)" },
          "50%": { transform: "rotateY(90deg)" },
          "100%": { transform: "rotateY(180deg)" },
        },
        bounceIn: {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "50%": { transform: "scale(1.05)", opacity: "1" },
          "70%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)" },
        },
        confetti: {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": {
            transform: "translateY(100vh) rotate(720deg)",
            opacity: "0",
          },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
      },
    },
  },
  plugins: [],
};
