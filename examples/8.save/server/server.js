
function register(app) {
  app.get('/get2', (req, res) => {
// {{{ GET2_IMPL

    const result = { api: 'get2' };
    res.send(result);

// }}}
  });

  app.get('/set2', (req, res) => {
// {{{ SET2_IMPL

    const result = { api: 'set2' };
    res.send(result);

// }}}
  });

}

