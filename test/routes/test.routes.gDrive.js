const request = require("supertest");
const chai = require('chai');
const expect = chai.expect;
const should = chai.should();

const app = require("../../app");

describe("Testing Get Files", () => {
    it("sending request to server", done => {
        request(app)
            .get("/gDrive/list-Files")
            .then((res, err) => {
                expect(res.statusCode).to.equal(200);
                done();
            })
            .catch(done);
    });

    it('Should have properties "kind" and "files"', done => {
        request(app)
            .get("/gDrive/list-Files")
            .then((res, err) => {
                res.body.should.have.property("kind");
                res.body.should.have.property("files");
                done();
            })
            .catch(done);
    });
});