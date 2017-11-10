'use strict';

let sessionToken;

const Store = {
  page: 'intro',
  currentQuestionIndex: null,
  userAnswers: [],
  feedback: null,
  sessionToken: '',

  getInitialStore(){
    this.page = 'intro';
    this.currentQuestionIndex = null;
    this.userAnswers = [];
    this.feedback= null;
    this.sessionToken;
  },

  getScore() {
    return this.userAnswers.reduce((accumulator, userAnswer, index) => {
      const question = this.getQuestion(index);
  
      if (question.correctAnswer === userAnswer) {
        return accumulator + 1;
      } else {
        return accumulator;
      }
    }, 0);
  },

  getCurrentQuestion() {
    return API.QUESTIONS[this.currentQuestionIndex];
  },
  
  getProgress() {
    return {
      current: this.currentQuestionIndex + 1,
      total: API.QUESTIONS.length
    };
  },
  
  getQuestion(index) {
    return API.QUESTIONS[index];
  },
};

////////////////////////////////////

const API = {
  BASE_API_URL: 'https://opentdb.com',
  TOP_LEVEL_COMPONENTS: [
    'js-intro', 'js-question', 'js-question-feedback', 
    'js-outro', 'js-quiz-status'
  ],
  
  QUESTIONS: [],

  buildBaseUrl(amt = 10, query = {}) {
    const url = new URL(this.BASE_API_URL + '/api.php');
    const queryKeys = Object.keys(query);
    url.searchParams.set('amount', amt)
  
    if(Store.sessionToken) {
      url.searchParams.set('token', store.sessionToken);
    }
  
    queryKeys.forEach(key => url.searchParams.set(key, query[key]));
    return url;
  },
  
  buildTokenUrl() {
    return new URL(this.BASE_API_URL + '/api_token.php');
  },
  
  fetchToken(callback) {
    if (sessionToken) {
      return callback();
    }
  
    const url = API.buildTokenUrl();
    url.searchParams.set('command', 'request');
  
    $.getJSON(url, res => {
      sessionToken = res.token;
      callback();
    }, err => console.log(err));
  },
  
  fetchQuestions(amt, query, callback) {
    $.getJSON(this.buildBaseUrl(amt, query), callback, err => console.log(err.message));
  },

  seedQuestions(questions) {
    this.QUESTIONS.length = 0;
    questions.forEach(q => this.QUESTIONS.push(this.createQuestion(q)));
  },
  
  fetchAndSeedQuestions(amt, query, callback) {
    this.fetchQuestions(amt, query, res => {
      this.seedQuestions(res.results);
      callback();
    });
  },
  
  createQuestion(question) {
    return {
      text: question.question,
      answers: [ ...question.incorrect_answers, question.correct_answer ],
      correctAnswer: question.correct_answer
    };
  }
};

///////////////////////////////////

const RENDER = {

  hideAll() {
    API.TOP_LEVEL_COMPONENTS.forEach(component => $(`.${component}`).hide());
  }, 

  render () {
    let html;
    RENDER.hideAll();
  
    const question = Store.getCurrentQuestion();
    const { feedback } = Store; 
    const { current, total } = Store.getProgress();
  
    $('.js-score').html(`<span>Score: ${Store.getScore()}</span>`);
    $('.js-progress').html(`<span>Question ${current} of ${total}`);
  
    switch (Store.page) {
      case 'intro':
        $('.js-intro').show();
        break;
      
      case 'question':
        html = generaterParentOBJ.generateQuestionHtml(question);
        $('.js-question').html(html);
        $('.js-question').show();
        $('.quiz-status').show();
        break;
  
      case 'answer':
        html = generaterParentOBJ.generateFeedbackHtml(feedback);
        $('.js-question-feedback').html(html);
        $('.js-question-feedback').show();
        $('.quiz-status').show();
        break;
  
      case 'outro':
        $('.js-outro').show();
        $('.quiz-status').show();
        break;
  
      default:
        return;
    }
  }
}

/////////////////////////////////////

const generaterParentOBJ = {

  generateAnswerItemHtml(answer) {
    return `
      <li class="answer-item">
        <input type="radio" name="answers" value="${answer}" />
        <span class="answer-text">${answer}</span>
      </li>
    `;
  },
  
  generateQuestionHtml(question) {
    const answers = question.answers
      .map((answer, index) => this.generateAnswerItemHtml(answer, index))
      .join('');
  
    return `
      <form>
        <fieldset>
          <legend class="question-text">${question.text}</legend>
            ${answers}
            <button type="submit">Submit</button>
        </fieldset>
      </form>
    `;
  },
  
  generateFeedbackHtml(feedback) {
    return `
      <p>
        ${feedback}
      </p>
      <button class="continue js-continue">Continue</button>
    `;
  }
};

////////////////////////////////////

const eventHandlerOBJ ={

  handleStartQuiz() {
    Store.getInitialStore();
    Store.page = 'question';
    Store.currentQuestionIndex = 0;
    const quantity = parseInt($('#js-question-quantity').find(':selected').val(), 10);
    API.fetchAndSeedQuestions(quantity, { type: 'multiple' }, () => {
      RENDER.render();
    });
  },
  
  handleSubmitAnswer(e) {
    e.preventDefault();
    const question = Store.getCurrentQuestion();
    const selected = $('input:checked').val();
    Store.userAnswers.push(selected);
    
    if (selected === question.correctAnswer) {
      Store.feedback = 'You got it!';
    } else {
      Store.feedback = `Too bad! The correct answer was: ${question.correctAnswer}`;
    }
  
    Store.page = 'answer';
    RENDER.render();
  },
  
  handleNextQuestion() {
    if (Store.currentQuestionIndex === API.QUESTIONS.length - 1) {
      Store.page = 'outro';
      RENDER.render();
      return;
    }
  
    Store.currentQuestionIndex++;
    Store.page = 'question';
    RENDER.render();
  }
}


// On DOM Ready, run render() and add event listeners
$(() => {
  // Run first render
  RENDER.render();

  // Fetch session token, enable Start button when complete
  API.fetchToken(() => {
    $('.js-start').attr('disabled', false);
  });

  $('.js-intro, .js-outro').on('click', '.js-start', eventHandlerOBJ.handleStartQuiz);
  $('.js-question').on('submit', eventHandlerOBJ.handleSubmitAnswer);
  $('.js-question-feedback').on('click', '.js-continue', eventHandlerOBJ.handleNextQuestion);
});






