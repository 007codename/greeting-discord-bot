const { Builder, loadImage, JSX, Font, registerFont } = require("canvacord");

// Register fonts at module load time
try {
  registerFont(require.resolve("@napi-rs/canvas/fonts/DejaVuSans.ttf"), { family: "DejaVuSans" });
} catch (e) {
  // Fallback if font registration fails
}

// Also try to load default
Font.loadDefault?.();

// Helper function to get ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'ST';
  if (j === 2 && k !== 12) return 'ND';
  if (j === 3 && k !== 13) return 'RD';
  return 'TH';
}

class WelcomeCard extends Builder {
  constructor() {
    super(1400, 350);
    this.bootstrap({
      displayName: "",
      avatar: "",
      memberCount: 0,
      backgroundImage: null,
    });
  }

  setDisplayName(value) {
    this.options.set("displayName", value);
    return this;
  }

  setAvatar(value) {
    this.options.set("avatar", value);
    return this;
  }

  setMemberCount(value) {
    this.options.set("memberCount", value);
    return this;
  }

  setBackgroundImage(value) {
    this.options.set("backgroundImage", value);
    return this;
  }

  async render() {
    const { displayName, avatar, memberCount, backgroundImage } = this.options.getOptions();

    let avatarImage = null;
    try {
      avatarImage = await loadImage(avatar);
    } catch (error) {
      console.warn(`⚠️ Failed to load avatar from URL: ${avatar}`, error.message);
    }

    let bgImage = null;
    if (backgroundImage) {
      try {
        bgImage = await loadImage(backgroundImage);
        // console.log(`✅ Loaded background image from: ${backgroundImage}`);
      } catch (error) {
        console.warn(`⚠️ Failed to load background image from URL: ${backgroundImage}`, error.message);
      }
    }

    let bgStyle = {
      width: "100%",
      height: "100%",
      backgroundColor: "#1a1a1a",
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      gap: "30px",
    };

    // If custom background image is provided, use it - don't set backgroundImage in style
    if (bgImage) {
      bgStyle.backgroundColor = "transparent";
    } else {
      bgStyle.backgroundImage = "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)";
    }

    const ordinalSuffix = getOrdinalSuffix(memberCount);

    return JSX.createElement(
      "div",
      { style: bgStyle },
      // Background image layer (if provided) - rendered first so it appears behind
      bgImage
        ? JSX.createElement("img", {
            src: bgImage.toDataURL(),
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            },
          })
        : null,
      // Avatar
      avatarImage
        ? JSX.createElement("img", {
            src: avatarImage.toDataURL(),
            style: {
              width: "200px",
              height: "200px",
              borderRadius: "50%",
              border: "4px solid #FFFFFF",
              objectFit: "cover",
              flexShrink: 0,
            },
          })
        : null,
      // Text container
      JSX.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "5px",
          },
        },
        // Welcome Text
        JSX.createElement(
          "h1",
          {
            style: {
              fontSize: "58px",
              fontWeight: "bold",
              color: "#FFFFFF",
              margin: "0",
              textAlign: "left",
              fontFamily: "DejaVuSans, Arial, sans-serif",
              textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            },
          },
          `WELCOME, ${displayName.toUpperCase()}!`
        ),
        // Member Count Text
        JSX.createElement(
          "p",
          {
            style: {
              fontSize: "38px",
              color: "#FFFFFF",
              margin: "0",
              textAlign: "left",
              fontFamily: "DejaVuSans, Arial, sans-serif",
              fontWeight: "600",
              textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
            },
          },
          `YOU'RE THE ${memberCount}${ordinalSuffix} STUDENT.`
        )
      )
    );
  }
}

module.exports = WelcomeCard;
