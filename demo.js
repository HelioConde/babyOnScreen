// Ativar a função de clicar sobre o objeto ou o click atravesar o objeto
const PointerFix = require("./electron-transparency-mouse-fix.js")

const fix = new PointerFix()

addEventListener('DOMContentLoaded', makeDraggable)

function makeDraggable() {
  const widget = document.querySelector('.widget')
  const handle = document.querySelector('.handle')
  widget.addEventListener('dragstart', console.log)
  widget.addEventListener('dragend', console.log)
  widget.addEventListener('drag', console.log)
}

// Pega o tamanho da tela
let width = window.innerWidth;
let height = window.innerHeight;

// random = Log de movimentos aleatorios * já começa com um movimento inicial
var random = Math.floor((Math.random() * 8) + 1);

// speed = Velocidade de animação
let speed = 1;

let timeValor = 2000;
let timeAction = timeValor;
// score = Log do tempo de animação para quando da Score X ele fazer uma ação
let score = 0;

// logAnimation = deixa gravado qual foi a ultima animação executada
let logAnimation = 0;

// developer = Mostra as cordernadas X e Y e coloca a borda em volta dos objetos
let developer = false;

// mouseOuver = Log quando o mouse passa em cima do char
let mouseOuver = false;

// tempo && timer = Velocidade das ações 
var tempo = 100;
var timer = setInterval(action, tempo);
var timer2 = setInterval(stateAnimation, tempo);
// Define início da animação
$("#char").css({
  'left': width / 6,
  'top': height / 6,
})

// A cada 20seg ele faz uma animação diferente
setInterval(() => {
  random = Math.floor((Math.random() * 8) + 1);
}, 20000);

// Depois de 1seg ativa a função de click
setTimeout(() => {
  clicks();
}, 1000);


function clicks() {
  $(".bar").mouseup(() => {
    navBar();
  })

  $('.hunger').mouseup(() => {
    navBar();
    hunger();
  })
  $('.sleep').mouseup(() => {
    navBar();
    sleep();
  })
  $('.diaper').mouseup(() => {
    navBar();
    diaper();
  })
  $('.medicine').mouseup(() => {
    navBar();
    medicine();
  })
  // Define o tamanho do main do tamanho da tela
  $("main").css({
    'width': width,
    'height': height,
  })

  ouverMouse();
}

function ouverMouse() {
  // Faz uma ação ao clicar no char
  $("#char").mousedown(() => {
    $("main").removeClass()
    $("main").addClass("ptr")
    clearInterval(timer);
    timer = null;
    $("main").css({
      'z-index': 2,
    })

    // Arrasta o char pela tela
    $("main").mousemove((e) => {
      $("#char").css({
        'left': e.pageX - 25,
        'top': e.pageY - 25
      })
    })
    // Soltar o char na tela
    $("main").mouseup(() => {
      $("main").css({
        'z-index': -1,
      })
      $("main").off("mousemove");
      $("main").off("mouseup");
      $("main").removeClass()
      $("main").addClass("no-ptr")
      clearInterval(timer);
      timer = null;
      timer = setInterval(action, tempo);
    });
  });
  $("#char").mouseover(() => {
    if (rest == false) {
      $("#char").removeAttr('class');
      $("#char").addClass('front2')
      logAnimation = 2;
      mouseOuver = true;
    }
  });
  $("#char").mouseout(() => {
    if (rest == false) {
      mouseOuver = false;
      $("#char").removeClass();
      $("#char").addClass('back1');
    }
  });
}

function clickM() {
  $(".mamadeira").mousedown(() => {
    $("main").removeClass()
    $("main").addClass("ptr")
    $("main").css({
      'z-index': 2,
    })

    // Arrasta o char pela tela
    $("main").mousemove((e) => {
      $(".mamadeira").css({
        'left': e.pageX - 6,
        'top': e.pageY - 17
      })
    })
    // Soltar o char na tela
    $("main").mouseup(() => {
      $("main").css({
        'z-index': -1,
      })

      $("main").off("mousemove");
      $("main").off("mouseup");
      $("main").removeClass()
      $("main").addClass("no-ptr")
      if (condition == 'fome') {
        let topChar = $("#char").offset().top
        let leftChar = $("#char").offset().left

        let topMamadeira = $(".mamadeira").offset().top
        let leftMamadeira = $(".mamadeira").offset().left

        if (parseFloat(topChar) <= parseFloat(topMamadeira)) {
          if (parseFloat(topChar) + 45 >= parseFloat(topMamadeira)) {
            if (parseFloat(leftChar) <= parseFloat(leftMamadeira)) {
              if (parseFloat(leftChar) + 45 >= parseFloat(leftMamadeira)) {
                $("#status").css('display', 'none');
                score = 0;
                $(".berco").off("mousedown");
                clearInterval(timer);
                timer = null;
                rest == true;
                $(".mamadeira").off("mousedown");
                $("#char").off('mouseover')
                $("#char").off('mouseout')
                $(".mamadeira").removeClass();
                $("#char").css('z-index', '2');
                mouseOuver = false;
                $("#char").removeClass();
                $("#char").addClass('eating');
                $("#char").off("mousedown");
                $("#char").off("mouseup");
                $("main").off("mousemove");
                $("main").off("mouseup");
                $("main").removeClass()
                clearInterval(timer);
                timer = null;
                setTimeout(() => {
                  timer = setInterval(action, tempo);
                  hunger();
                  $("#char").css('z-index', '0');
                  rest == false;
                  var audioElement = new Audio('./som/rindo.mp3');
                  audioElement.play();
                  ouverMouse();
                  condition = null;
                  stateStatus = false;
                  timeAction = timeValor;
                }, 10000);
              }
            }
          }
        }
      }
    });
  });
}

let rest = false;
function clickB() {
  $(".berco").mousedown(() => {
    $("main").removeClass()
    $("main").addClass("ptr")
    $("main").css({
      'z-index': 2,
    })

    // Arrasta o char pela tela
    $("main").mousemove((e) => {
      $(".berco").css({
        'left': e.pageX - 6,
        'top': e.pageY - 17
      })
    })
    // Soltar o char na tela
    $("main").mouseup(() => {
      $("main").css({
        'z-index': -1,
      })

      $("main").off("mousemove");
      $("main").off("mouseup");
      $("main").removeClass()
      $("main").addClass("no-ptr")
      if (condition == 'sono') {
        let topChar = $("#char").offset().top
        let leftChar = $("#char").offset().left

        let topBerco = $(".berco").offset().top
        let leftBerco = $(".berco").offset().left

        if (parseFloat(topChar) <= parseFloat(topBerco)) {
          if (parseFloat(topChar) + 45 >= parseFloat(topBerco)) {
            if (parseFloat(leftChar) <= parseFloat(leftBerco)) {
              if (parseFloat(leftChar) + 45 >= parseFloat(leftBerco)) {
                $("#status").css('display', 'none');
                score = 0;
                $(".berco").off("mousedown");
                clearInterval(timer);
                timer = null;
                rest == true;
                $("#char").off('mouseover')
                $("#char").off('mouseout')
                $(".berco").removeClass();
                $(".berco").off("mousedown");
                $("#char").css('z-index', '2');
                mouseOuver = false;
                $("#char").removeClass();
                $("#char").addClass('sleep2');
                $("#char").off("mousedown");
                $("#char").off("mouseup");
                $("main").off("mousemove");
                $("main").off("mouseup");
                $("main").removeClass()
                clearInterval(timer);
                timer = null;

                setTimeout(() => {
                  timer = setInterval(action, tempo);
                  sleep();
                  $("#char").css('z-index', '0');
                  rest == false;
                  ouverMouse();
                  condition = null;
                  stateStatus = false;
                  var audioElement = new Audio('./som/rindo.mp3');
                  audioElement.play();
                  timeAction = timeValor;
                }, 180000);
              }
            }
          }
        }
      }
    });
  });
}

function clickF() {
  $(".flauda").mousedown(() => {
    $("main").removeClass()
    $("main").addClass("ptr")
    $("main").css({
      'z-index': 2,
    })

    // Arrasta o char pela tela
    $("main").mousemove((e) => {
      $(".flauda").css({
        'left': e.pageX - 6,
        'top': e.pageY - 17
      })
    })
    // Soltar o char na tela
    $("main").mouseup(() => {
      $("main").css({
        'z-index': -1,
      })

      $("main").off("mousemove");
      $("main").off("mouseup");
      $("main").removeClass()
      $("main").addClass("no-ptr")
      if (condition == "flauda") {
        let topChar = $("#char").offset().top
        let leftChar = $("#char").offset().left

        let topFlauda = $(".flauda").offset().top
        let leftFlauda = $(".flauda").offset().left

        if (parseFloat(topChar) <= parseFloat(topFlauda)) {
          if (parseFloat(topChar) + 45 >= parseFloat(topFlauda)) {
            if (parseFloat(leftChar) <= parseFloat(leftFlauda)) {
              if (parseFloat(leftChar) + 45 >= parseFloat(leftFlauda)) {
                $("#status").css('display', 'none');
                score = 0;
                $(".flauda").off("mousedown");
                diaper();
                var audioElement = new Audio('./som/rindo.mp3');
                audioElement.play();
                condition = null;
                stateStatus = false;
                timeAction = timeValor;
              }
            }
          }
        }
      }
    });
  });
}


function clickME() {
  $(".remedio").mousedown(() => {
    $("main").removeClass()
    $("main").addClass("ptr")
    $("main").css({
      'z-index': 2,
    })

    // Arrasta o char pela tela
    $("main").mousemove((e) => {
      $(".remedio").css({
        'left': e.pageX - 6,
        'top': e.pageY - 17
      })
    })
    // Soltar o char na tela
    $("main").mouseup(() => {
      $("main").css({
        'z-index': -1,
      })

      $("main").off("mousemove");
      $("main").off("mouseup");
      $("main").removeClass()
      $("main").addClass("no-ptr")
      if (condition == "remedio") {
        let topChar = $("#char").offset().top
        let leftChar = $("#char").offset().left

        let topFlauda = $(".remedio").offset().top
        let leftFlauda = $(".remedio").offset().left

        if (parseFloat(topChar) <= parseFloat(topFlauda)) {
          if (parseFloat(topChar) + 45 >= parseFloat(topFlauda)) {
            if (parseFloat(leftChar) <= parseFloat(leftFlauda)) {
              if (parseFloat(leftChar) + 45 >= parseFloat(leftFlauda)) {
                $("#status").css('display', 'none');
                score = 0;
                $(".remedio").off("mousedown");
                diaper();
                var audioElement = new Audio('./som/rindo.mp3');
                audioElement.play();
                condition = null;
                stateStatus = false;
                timeAction = timeValor;
              }
            }
          }
        }
      }
    });
  });
}

function action() {
  score++
  let top = $("#char").offset().top
  let left = $("#char").offset().left

  if (developer == true) {
    $("#char").css({
      "border": "1px solid red"
    })
    $("#developer").css({
      'top': top + 10,
      'left': left + 50,
    })
    $("#right").html(parseInt(top))
    $("#left").html(parseInt(left))
  }

  if (score == parseFloat(timeAction)) {
    var audioElement = new Audio('./som/rindo2.mp3');
    audioElement.play();
  }
  if (score == parseFloat(timeAction) * 2) {
    var audioElement = new Audio('./som/feliz.mp3');
    audioElement.play();
  }
  if (score == parseFloat(timeAction) * 3) {
    var audioElement = new Audio('./som/rindo2.mp3');
    audioElement.play();
  }
  if (score == parseFloat(timeAction) * 4) {
    var audioElement = new Audio('./som/rindo2.mp3');
    audioElement.play();
  }

  if (score >= parseFloat(timeAction) * 5) {
    timeAction = timeAction + 100;
    var audioElement = new Audio('./som/chorando.mp3');
    audioElement.play();
    if (stateStatus == false) {
      stateStatus = true;
      state();
    }
  }

  if (top <= 0) {
    let log = Math.floor((Math.random() * 8) + 1);
    if (log == 8 || log == 1 || log == 2) {
    } else {
      random = log;
    }
  } else if (top >= height - 25) {
    let log = Math.floor((Math.random() * 8) + 1);
    if (log == 4 || log == 5 || log == 6) {
    } else {
      random = log;
    }
  } else if (left <= 0) {
    let log = Math.floor((Math.random() * 8) + 1);
    if (log == 6 || log == 7 || log == 8) {
    } else {
      random = log;
    }
  } else if (left >= width - 25) {
    let log = Math.floor((Math.random() * 8) + 1);
    if (log == 2 || log == 3 || log == 4) {
    } else {
      random = log;
    }
  }

  if (mouseOuver == false) {
    if (random == 1) {
      $("#char").css({
        'top': top - speed,
      })
      if (logAnimation == 0) {
        $("#char").removeAttr('class');
        $("#char").addClass('back1')
        logAnimation = 1;
      } else if (logAnimation == 1) {
        $("#char").removeAttr('class');
        $("#char").addClass('back2')
        logAnimation = 2;
      } else if (logAnimation == 2) {
        $("#char").removeAttr('class');
        $("#char").addClass('back3')
        logAnimation = 3;
      } else {
        $("#char").removeAttr('class');
        $("#char").addClass('back2')
        logAnimation = 0;
      }
    }
    if (random == 2) {
      //Move para direita e topo
      $("#char").css({
        'top': top - speed,
        'left': left + speed,
      })
      if (logAnimation == 0) {
        $("#char").removeAttr('class');
        $("#char").addClass('right1')
        logAnimation = 1;
      } else if (logAnimation == 1) {
        $("#char").removeAttr('class');
        $("#char").addClass('right2')
        logAnimation = 2;
      } else if (logAnimation == 2) {
        $("#char").removeAttr('class');
        $("#char").addClass('right3')
        logAnimation = 3;
      } else {
        $("#char").removeAttr('class');
        $("#char").addClass('right2')
        logAnimation = 0;
      }
    }
    if (random == 3) {
      // move para a direita
      $("#char").css({
        'left': left + speed,
      })
      if (logAnimation == 0) {
        $("#char").removeAttr('class');
        $("#char").addClass('right1')
        logAnimation = 1;
      } else if (logAnimation == 1) {
        $("#char").removeAttr('class');
        $("#char").addClass('right2')
        logAnimation = 2;
      } else if (logAnimation == 2) {
        $("#char").removeAttr('class');
        $("#char").addClass('right3')
        logAnimation = 3;
      } else {
        $("#char").removeAttr('class');
        $("#char").addClass('right2')
        logAnimation = 0;
      }
    }
    if (random == 4) {
      // move para a direita baixo
      $("#char").css({
        'top': top + speed,
        'left': left + speed,
      })
      if (logAnimation == 0) {
        $("#char").removeAttr('class');
        $("#char").addClass('right1')
        logAnimation = 1;
      } else if (logAnimation == 1) {
        $("#char").removeAttr('class');
        $("#char").addClass('right2')
        logAnimation = 2;
      } else if (logAnimation == 2) {
        $("#char").removeAttr('class');
        $("#char").addClass('right3')
        logAnimation = 3;
      } else {
        $("#char").removeAttr('class');
        $("#char").addClass('right2')
        logAnimation = 0;
      }
    }
    if (random == 5) {
      // move para a baixo
      $("#char").css({
        'top': top + speed,
      })
      if (logAnimation == 0) {
        $("#char").removeAttr('class');
        $("#char").addClass('front1')
        logAnimation = 1;
      } else if (logAnimation == 1) {
        $("#char").removeAttr('class');
        $("#char").addClass('front2')
        logAnimation = 2;
      } else if (logAnimation == 2) {
        $("#char").removeAttr('class');
        $("#char").addClass('front3')
        logAnimation = 3;
      } else {
        $("#char").removeAttr('class');
        $("#char").addClass('front2')
        logAnimation = 0;
      }
    }
    if (random == 6) {
      // move para a baixo esquerda
      $("#char").css({
        'top': top + speed,
        'left': left - speed,
      })
      if (logAnimation == 0) {
        $("#char").removeAttr('class');
        $("#char").addClass('left1')
        logAnimation = 1;
      } else if (logAnimation == 1) {
        $("#char").removeAttr('class');
        $("#char").addClass('left2')
        logAnimation = 2;
      } else if (logAnimation == 2) {
        $("#char").removeAttr('class');
        $("#char").addClass('left3')
        logAnimation = 3;
      } else {
        $("#char").removeAttr('class');
        $("#char").addClass('left2')
        logAnimation = 0;
      }
    }
    if (random == 7) {
      // move para a esquerda
      $("#char").css({
        'left': left - speed,
      })
      if (logAnimation == 0) {
        $("#char").removeAttr('class');
        $("#char").addClass('left1')
        logAnimation = 1;
      } else if (logAnimation == 1) {
        $("#char").removeAttr('class');
        $("#char").addClass('left2')
        logAnimation = 2;
      } else if (logAnimation == 2) {
        $("#char").removeAttr('class');
        $("#char").addClass('left3')
        logAnimation = 3;
      } else {
        $("#char").removeAttr('class');
        $("#char").addClass('left2')
        logAnimation = 0;
      }
    }
    if (random == 8) {
      // move para a topo esquerda
      $("#char").css({
        'top': top - speed,
        'left': left - speed,
      })
      if (logAnimation == 0) {
        $("#char").removeAttr('class');
        $("#char").addClass('left1')
        logAnimation = 1;
      } else if (logAnimation == 1) {
        $("#char").removeAttr('class');
        $("#char").addClass('left2')
        logAnimation = 2;
      } else if (logAnimation == 2) {
        $("#char").removeAttr('class');
        $("#char").addClass('left3')
        logAnimation = 3;
      } else {
        $("#char").removeAttr('class');
        $("#char").addClass('left2')
        logAnimation = 0;
      }
    }
  }
};
let bar = false;

let mamadeira = false;
let sleeping = false;
let dirty = false;
function hunger() {
  if (mamadeira != false) {
    $("#obj").html("")
    mamadeira = false;
  } else {
    $("#obj").html("<div style='position:fixed;' class='mamadeira ptr'></div>")
    mamadeira = true;
    clickM();
  }
}
function sleep() {
  if (sleeping != false) {
    $("#obj").html("")
    sleeping = false;
  } else {
    $("#obj").html("<div style='position:fixed;' class='berco ptr'></div>")
    sleeping = true;
    clickB();
  }
}

function diaper() {
  if (dirty != false) {
    $("#obj").html("")
    dirty = false;
  } else {
    $("#obj").html("<div style='position:fixed;' class='flauda ptr'></div>")
    dirty = true;
    clickF();
  }
}

function medicine() {
  if (dirty != false) {
    $("#obj").html("")
    dirty = false;
  } else {
    $("#obj").html("<div style='position:fixed;' class='remedio ptr'></div>")
    dirty = true;
    clickME();
  }
}

function navBar() {
  if (bar != false) {
    bar = false;
    $(".navBar").css("display", "none");
  } else {
    bar = true;
    $(".navBar").css("display", "inline-block");
  }
}
let condition = null;
let stateStatus = false;
function state() {
  let status = Math.floor((Math.random() * 4) + 1);
  if (status == 1) {
    $("#status").html("<div style='position:null;' class='status mamadeira2'></div>")
    $("#status").css('display', 'inline-block');
    condition = 'fome';
  } else if (status == 2) {
    $("#status").html("<div style='position:null;' class='status berco2'></div>")
    $("#status").css('display', 'inline-block');
    condition = 'sono';
  } else if (status == 3) {
    $("#status").html("<div style='position:null;' class='status flauda2'></div>")
    $("#status").css('display', 'inline-block');
    condition = 'flauda';
  } else if (status == 4) {
    $("#status").html("<div style='position:null;' class='status remedio2'></div>")
    $("#status").css('display', 'inline-block');
    condition = 'remedio';
  } else {
    $("#status").html("");
    condition = null;
  }
}

function stateAnimation() {
  let top = $("#char").offset().top
  let left = $("#char").offset().left
  if (condition == 'fome') {
    $("#status").css({
      'top': top - 50,
      'left': left + 50,
    })
  } else if (condition == 'sono') {
    $("#status").css({
      'top': top - 50,
      'left': left + 50,
    })
  } else if (condition == 'flauda') {
    $("#status").css({
      'top': top - 50,
      'left': left + 50,
    })
  } else if (condition == 'remedio'){
    $("#status").css({
      'top': top - 50,
      'left': left + 50,
    })
  }
}