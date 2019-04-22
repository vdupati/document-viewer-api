const request = require("supertest");
const chai = require('chai');
const expect = chai.expect;
const should = chai.should();

const app = require("../../app");

describe("Testing Get Files", () => {
    it("sending request to server", done => {
        request(app)
            .get("/gDrive/list-files/root")
            .then((res, err) => {
                expect(res.statusCode).to.equal(200);
                done();
            })
            .catch(done);
    });

    it('Should have at least one file', done => {
        request(app)
            .get("/gDrive/list-files/root")
            .then((res, err) => {
                var fileArray = [];
                res.body.forEach(element => {
                    fileArray.push(element.name);
                });
                fileArray.should.have.any.keys("0");
                done();
            })
            .catch(done);
    });
});