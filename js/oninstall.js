$(() => {
  init();
});

function init() {

  var choice = async () => {
    const {test} = await Swal.fire({
      title: 'Success!',
      html: 'You can trigger this modal at anytime by clicking the icon in the top right. Make sure you go to uber.com and sign in before clicking continue! <a href="https://auth.uber.com/login" target="_blank">Go to uber.com</a>',
      confirmButtonText: 'Continue &rarr;',
      showCancelButton: true
    });
    const {value} = await Swal.fire({
      title: 'Select Uber Product',
      html: 'Important: <b>Once the page has loaded, click the extension icon in the header again</b>',
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

  $("#continue").on('click', (ev) => {
    console.log('h');
    choice();
  });
}
