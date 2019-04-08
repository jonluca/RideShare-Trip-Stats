var choice = async () => {
  const {value} = await Swal.fire({
    title: 'You are not on an uber site. Please select an option then click the icon again.',
    input: 'radio',
    showCancelButton: true,
    inputOptions: {
      eats: "UberEats",
      rides: "Uber Rides"
    }
  });
  if (value) {
    if (value === 'eats') {
      window.open("https://www.ubereats.com/en-US/orders/", "_blank");
    } else if (value === "rides") {
      window.open("https://riders.uber.com/trips", "_blank");
    }
  }
};

choice();
