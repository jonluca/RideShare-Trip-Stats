$(() => {
  init();
});

function init() {

  var choice = async () => {
    const {test} = await Swal.fire({
      title: 'Success!',
      text: 'You can trigger this modal at anytime by clicking the icon in the top right. Make sure you go to uber.com and sign in before clicking continue!',
      confirmButtonText: 'Continue &rarr;',
      showCancelButton: true
    });
    const {value} = await Swal.fire({
      title: 'Select which site you want, then click the extension icon once the site has loaded.',
      text: 'Also a reminder - delete this extension after you are done!',
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
